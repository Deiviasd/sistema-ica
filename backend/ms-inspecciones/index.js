const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { supabase } = require('./src/config/supabase');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4003;
const PREDIOS_URL = process.env.PREDIOS_SERVICE_URL || 'http://ms-predios:4001';

// --- CONSULTA DE HISTORIAL ---
app.get('/inspecciones', async (req, res) => {
    try {
        const { tecnico_id, productor_id, lugar_id } = req.query;
        let query = supabase.from('inspeccion').select('*, detalle_inspeccion(*)').order('created_at', { ascending: false });

        if (tecnico_id) query = query.eq('tecnico_id', tecnico_id);
        if (productor_id) query = query.eq('productor_id', productor_id);
        if (lugar_id) query = query.eq('id_lugar_produccion', lugar_id);

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- REGISTRO DE CABECERA ---
app.post('/inspecciones', async (req, res) => {
    try {
        const { id_lugar_produccion, productor_id, tecnico_id, fecha_programada, observaciones_generales } = req.body;
        const { data, error } = await supabase.from('inspeccion').insert([{
            id_lugar_produccion, productor_id, tecnico_id, fecha_programada, observaciones_generales, estado: 'programada'
        }]).select();
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- REGISTRO DE DETALLE (Cambia a "en_proceso" automáticamente) ---
app.post('/inspecciones/:id/detalles', async (req, res) => {
    try {
        const { id } = req.params;
        const detail = req.body;

        // 1. Registrar detalle
        const { data: detailData, error: detailError } = await supabase.from('detalle_inspeccion').insert([{
            id_inspeccion: id, ...detail
        }]).select();
        if (detailError) throw detailError;

        // 2. Mover a 'en_proceso' si estaba 'programada'
        await supabase.from('inspeccion')
            .update({ estado: 'en_proceso' })
            .eq('id_inspeccion', id)
            .eq('estado', 'programada');

        res.status(201).json(detailData[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- CAMBIO MANUAL DE ESTADO (e.j. a 'pendiente') ---
app.patch('/inspecciones/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body; // 'en_proceso' o 'pendiente'

        if (estado === 'realizada') return res.status(400).json({ error: 'Use el endpoint /finalizar para cerrar la inspección' });

        const { data, error } = await supabase.from('inspeccion').update({ estado }).eq('id_inspeccion', id).select();
        if (error) throw error;
        res.json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- CIERRE DE INSPECCIÓN (VALIDACIÓN DE LOTES) ---
app.patch('/inspecciones/:id/finalizar', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Obtener la inspección para saber cuál es el lugar de producción
        const { data: insp, error: inspErr } = await supabase.from('inspeccion').select('id_lugar_produccion').eq('id_inspeccion', id).single();
        if (inspErr) throw inspErr;

        // 2. Comunicarnos con MS-Predios para saber cuántos lotes hay allí
        // Nota: En producción esto iría por el Gateway, aquí usamos llamada directa para eficiencia
        const prediosRes = await axios.get(`${PREDIOS_URL}/lugares-produccion?id=${insp.id_lugar_produccion}`);
        const totalLotes = prediosRes.data[0]?.lote?.length || 0;

        // 3. Contar cuántos detalles hemos registrado para esta inspección
        const { count, error: countErr } = await supabase
            .from('detalle_inspeccion')
            .select('*', { count: 'exact', head: true })
            .eq('id_inspeccion', id);
        
        if (countErr) throw countErr;

        // 4. Validar
        if (count < totalLotes) {
            return res.status(400).json({ 
                error: 'Inspección incompleta', 
                message: `Se requiere inspeccionar todos los lotes (${totalLotes}). Registrados actualmente: ${count}.`
            });
        }

        // 5. Finalizar
        const { data, error } = await supabase.from('inspeccion').update({ estado: 'realizada' }).eq('id_inspeccion', id).select();
        if (error) throw error;

        res.json({ message: 'Inspección cerrada con éxito. Registro inmutable.', data: data[0] });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ MS-Inspecciones (Workflow ICA) corriendo en puerto ${PORT}`);
});

const express = require('express');
const cors = require('cors');
const { supabase } = require('./src/config/supabase');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4003;

// --- ENDPOINTS DE HISTORIAL ---
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

// --- REGISTRO DE INSPECCIÓN ---
app.post('/inspecciones', async (req, res) => {
    try {
        const { fecha_programada, id_lugar_produccion, productor_id, tecnico_id, observaciones_generales } = req.body;
        const { data, error } = await supabase.from('inspeccion').insert([{ 
            fecha_programada, id_lugar_produccion, productor_id, tecnico_id, observaciones_generales, estado: 'programada' 
        }]).select();
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/inspecciones/:id/detalles', async (req, res) => {
    try {
        const { id } = req.params;
        const { siembra_id, plaga_id, cantidad_plantas_afectadas, porcentaje_infestacion, observaciones_especificas } = req.body;
        const { data, error } = await supabase.from('detalle_inspeccion').insert([{
            id_inspeccion: id, siembra_id, plaga_id, cantidad_plantas_afectadas, porcentaje_infestacion, observaciones_especificas
        }]).select();
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/inspecciones/:id/finalizar', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase.from('inspeccion').update({ estado: 'realizada' }).eq('id_inspeccion', id).select();
        if (error) throw error;
        res.json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ MS-Inspecciones corriendo en puerto ${PORT}`);
});

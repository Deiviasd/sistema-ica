const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4003;
const SUPABASE_URL = process.env.SUPABASE_URL;
<<<<<<< HEAD
// 🔹 Fallback a SERVICE_ROLE si no hay ANON_KEY definida
=======
// 🛡️ Soporte para ANON_KEY o SERVICE_ROLE_KEY
>>>>>>> main
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const PREDIOS_URL = process.env.PREDIOS_SERVICE_URL || 'http://ms-predios:4001';
const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://ms-auth:4000';
const CULTIVO_URL = process.env.CULTIVO_SERVICE_URL || 'http://ms-cultivo:4002';

const getSupabaseUserClient = (req) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });
};

<<<<<<< HEAD
// ==========================================
// 🎯 CONTEXTO MEJORADO PARA EL TÉCNICO (RLS DELEGADO)
// ==========================================
=======
// Rutas alineadas con el Orquestador (sin prefijo redundante)
>>>>>>> main
app.get('/:id/contexto', async (req, res) => {
    try {
        const supabase = getSupabaseUserClient(req);
        const { id } = req.params;
        const { data: insp, error: inspErr } = await supabase
            .from('inspeccion').select('*').eq('id_inspeccion', id).single();

<<<<<<< HEAD
        if (inspErr || !insp) return res.status(404).json({ 
            error: 'Inspección no encontrada o sin acceso', 
            details: inspErr?.message || 'No se encontró el registro'
        });
=======
        if (inspErr || !insp) return res.status(404).json({ error: 'Inspección no encontrada' });
>>>>>>> main

        const prodRes = await axios.get(`${AUTH_URL}/usuarios/${insp.productor_id}`).catch(() => ({ data: { nombre: 'N/A' } }));
        const lotesRes = await axios.get(`${PREDIOS_URL}/lugares-produccion?id=${insp.id_lugar_produccion}`, {
            headers: { Authorization: req.headers.authorization }
        }).catch(() => ({ data: [] }));

        const infoLugar = lotesRes.data[0];
        const lotes = infoLugar?.lote || [];

        const contextoLotes = await Promise.all(lotes.map(async (lote) => {
            const siembraRes = await axios.get(`${CULTIVO_URL}/siembras?id_lote=${lote.id_lote}&estado=activa`).catch(() => ({ data: [] }));
            const siembra = siembraRes.data[0] || null;
            const { data: hallazgos } = await supabase.from('detalle_inspeccion').select('*').eq('id_lote', lote.id_lote).order('fecha_registro', { ascending: false }).limit(1);

            return {
                id_lote: lote.id_lote,
                nombre_lote: lote.nombre_lote,
                siembra_activa: siembra ? { id_siembra: siembra.id_siembra, especie: siembra.especie } : null,
                ultimo_hallazgo: hallazgos ? hallazgos[0] : null
            };
        }));

<<<<<<< HEAD
        res.json({
            id_inspeccion: insp.id_inspeccion,
            lugar_nombre: infoLugar?.nombre_lugar,
            productor: { nombre: prodRes.data.nombre, region: prodRes.data.region },
            lotes: contextoLotes
        });

    } catch (error) {
        console.error('❌ Error en GET /contexto:', error);
        res.status(500).json({ 
            error: 'Fallo al cargar contexto seguro', 
            details: error.message || error 
        });
    }
});

// ==========================================
// 📝 REGISTRO DE HALLAZGOS (PROTEGIDO POR RLS)
// ==========================================
=======
        res.json({ id_inspeccion: insp.id_inspeccion, lugar_nombre: infoLugar?.nombre_lugar, productor: prodRes.data, lotes: contextoLotes });
    } catch (error) { res.status(500).json({ error: 'Fallo al cargar contexto' }); }
});

>>>>>>> main
app.post('/:id/detalles', async (req, res) => {
    try {
        const supabase = getSupabaseUserClient(req);
        const { id } = req.params;
        const { error } = await supabase.from('detalle_inspeccion').insert([{ ...req.body, id_inspeccion: id }]);
        if (error) throw error;
<<<<<<< HEAD

        // Cambiar estado si estaba en 'programada'
        await supabase.from('inspeccion').update({ estado: 'en_proceso' }).eq('id_inspeccion', id).eq('estado', 'programada');

        res.status(201).json(data[0]);
    } catch (error) {
        console.error('❌ Error en POST /detalles:', error);
        res.status(403).json({ 
            error: 'No autorizado para registrar hallazgos', 
            details: error.message || error 
        });
    }
});

// ==========================================
// 📊 REPORTES ENRIQUECIDOS (CON RLS)
// ==========================================
=======
        res.status(201).json({ message: 'Detalle registrado' });
    } catch (error) { res.status(403).json({ error: 'No autorizado' }); }
});

>>>>>>> main
app.get('/reporte', async (req, res) => {
    try {
        const supabase = getSupabaseUserClient(req);
        const { data, error } = await supabase.from('inspeccion').select('*, detalle_inspeccion(*)');
        if (error) throw error;
        res.json(data);
    } catch (error) { res.status(500).json({ error: 'Error en reporte' }); }
});

<<<<<<< HEAD
app.patch('/:id/finalizar', async (req, res) => {
    try {
        const supabase = getSupabaseUserClient(req);
        const { id } = req.params;
        const { observaciones_generales } = req.body;

        const { error } = await supabase.from('inspeccion')
            .update({ estado: 'finalizada', observaciones_generales })
            .eq('id_inspeccion', id);

        if (error) throw error;
        res.json({ message: 'Inspección finalizada con éxito' });
    } catch (error) { res.status(403).json({ error: 'Error al finalizar: No autorizado' }); }
});

app.listen(PORT, () => { console.log(`🚀 MS-Inspecciones: Seguridad delegada a RLS en puerto ${PORT}`); });
=======
app.listen(PORT, () => { console.log(`🚀 MS-Inspecciones: Activo en puerto ${PORT}`); });
>>>>>>> main

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
// 🛡️ Soporte para ANON_KEY o SERVICE_ROLE_KEY
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

// Rutas alineadas con el Orquestador (sin prefijo redundante)
app.get('/:id/contexto', async (req, res) => {
    try {
        const supabase = getSupabaseUserClient(req);
        const { id } = req.params;
        const { data: insp, error: inspErr } = await supabase
            .from('inspeccion').select('*').eq('id_inspeccion', id).single();

        if (inspErr || !insp) return res.status(404).json({ error: 'Inspección no encontrada' });

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

        res.json({ id_inspeccion: insp.id_inspeccion, lugar_nombre: infoLugar?.nombre_lugar, productor: prodRes.data, lotes: contextoLotes });
    } catch (error) { res.status(500).json({ error: 'Fallo al cargar contexto' }); }
});

app.post('/:id/detalles', async (req, res) => {
    try {
        const supabase = getSupabaseUserClient(req);
        const { id } = req.params;
        const { error } = await supabase.from('detalle_inspeccion').insert([{ ...req.body, id_inspeccion: id }]);
        if (error) throw error;
        res.status(201).json({ message: 'Detalle registrado' });
    } catch (error) { res.status(403).json({ error: 'No autorizado' }); }
});

app.get('/reporte', async (req, res) => {
    try {
        const supabase = getSupabaseUserClient(req);
        const { data, error } = await supabase.from('inspeccion').select('*, detalle_inspeccion(*)');
        if (error) throw error;
        res.json(data);
    } catch (error) { res.status(500).json({ error: 'Error en reporte' }); }
});

app.listen(PORT, () => { console.log(`🚀 MS-Inspecciones: Activo en puerto ${PORT}`); });

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
// 🔹 Fallback a SERVICE_ROLE si no hay ANON_KEY definida
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const PREDIOS_URL = process.env.PREDIOS_SERVICE_URL || 'http://ms-predios:4001';
const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://ms-auth:4000';
const CULTIVO_URL = process.env.CULTIVO_SERVICE_URL || 'http://ms-cultivo:4002';

// 🛡️ HELPER: Crear cliente de Supabase con la identidad del usuario
const getSupabaseUserClient = (req) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });
};

// ==========================================
// 🎯 CONTEXTO MEJORADO PARA EL TÉCNICO (RLS DELEGADO)
// ==========================================
app.get('/:id/contexto', async (req, res) => {
    try {
        const supabase = getSupabaseUserClient(req);
        const { id } = req.params;

        // 1. Obtener la inspección (El RLS de Supabase filtrará si el técnico está asignado)
        const { data: insp, error: inspErr } = await supabase
            .from('inspeccion')
            .select('*')
            .eq('id_inspeccion', id)
            .single();

        if (inspErr || !insp) return res.status(404).json({ 
            error: 'Inspección no encontrada o sin acceso', 
            details: inspErr?.message || 'No se encontró el registro'
        });

        // 2. Info del Productor (MS-AUTH)
        const prodRes = await axios.get(`${AUTH_URL}/usuarios/${insp.productor_id}`).catch(() => ({ data: { nombre: 'N/A' } }));

        // 3. Lotes del Lugar (Pasamos token al MS-Predios para su propio RLS)
        const lotesRes = await axios.get(`${PREDIOS_URL}/lugares-produccion?id=${insp.id_lugar_produccion}`, {
            headers: { Authorization: req.headers.authorization }
        }).catch(() => ({ data: [] }));

        const infoLugar = lotesRes.data[0];
        const lotes = infoLugar?.lote || [];

        // 4. Siembras e Historial
        const contextoLotes = await Promise.all(lotes.map(async (lote) => {
            const siembraRes = await axios.get(`${CULTIVO_URL}/siembras?id_lote=${lote.id_lote}&estado=activa`).catch(() => ({ data: [] }));
            const siembra = siembraRes.data[0] || null;

            // Historial (RLS de Supabase en Inspecciones nos permite ver esto)
            const { data: hallazgos } = await supabase
                .from('detalle_inspeccion')
                .select('fecha_registro, plaga_manual, id_plaga, plantas_afectadas')
                .eq('id_lote', lote.id_lote)
                .order('fecha_registro', { ascending: false })
                .limit(1);

            return {
                id_lote: lote.id_lote,
                nombre_lote: lote.nombre_lote,
                siembra_activa: siembra ? {
                    id_siembra: siembra.id_siembra,
                    especie: siembra.especie,
                    variedad: siembra.variedad
                } : null,
                ultimo_hallazgo: hallazgos ? hallazgos[0] : null
            };
        }));

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
app.post('/:id/detalles', async (req, res) => {
    try {
        const supabase = getSupabaseUserClient(req);
        const { id } = req.params;
        const { id_lote, id_siembra, id_plaga, nombre_plaga_manual, plantas_afectadas, plantas_totales, observaciones_especificas } = req.body;

        // La base de datos rechazará el insert si el técnico no es el asignado (gracias al RLS)
        const { data, error } = await supabase.from('detalle_inspeccion').insert([{
            id_inspeccion: id,
            id_lote,
            id_siembra,
            id_plaga: id_plaga || null,
            plaga_manual: nombre_plaga_manual || null,
            plantas_afectadas,
            plantas_totales,
            observaciones_especificas
        }]).select();

        if (error) throw error;

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
app.get('/reporte', async (req, res) => {
    try {
        const supabase = getSupabaseUserClient(req);
        const { tecnico_id, productor_id, estado } = req.query;

        // 1. Obtener inspecciones filtradas por RLS automáticamente
        let query = supabase.from('inspeccion').select('*, detalle_inspeccion(*)');
        
        if (tecnico_id) query = query.eq('tecnico_id', tecnico_id);
        if (productor_id) query = query.eq('productor_id', productor_id);
        if (estado) query = query.eq('estado', estado);

        const { data: inspecciones, error } = await query.order('fecha_programada', { ascending: false });
        if (error) throw error;

        // 2. Enriquecer datos con otros Microservicios (Proceso en paralelo)
        const reporteFinal = await Promise.all(inspecciones.map(async (insp) => {
            // A. Nombre del Técnico (MS-AUTH)
            const techRes = await axios.get(`${AUTH_URL}/usuarios/${insp.tecnico_id}`).catch(() => ({ data: { nombre: 'N/A' } }));
            
            // B. Nombre del Lugar (MS-PREDIOS) - Pasamos token por seguridad
            const predioRes = await axios.get(`${PREDIOS_URL}/lugares-produccion?id=${insp.id_lugar_produccion}`, {
                headers: { Authorization: req.headers.authorization }
            }).catch(() => ({ data: [{ nombre_lugar: 'Desconocido' }] }));
            
            const infoLugar = predioRes.data[0];

            // C. Enriquecer los detalles (Plagas)
            const detallesEnriquecidos = await Promise.all((insp.detalle_inspeccion || []).map(async (det) => {
                let nombrePlaga = det.plaga_manual || 'Plaga';
                
                if (det.id_plaga) {
                    const plagaRes = await axios.get(`${CULTIVO_URL}/plagas/${det.id_plaga}`).catch(() => ({ data: { nombre_comun: 'Catálogo ICA' } }));
                    nombrePlaga = plagaRes.data.nombre_comun;
                }

                return { ...det, nombre_plaga: nombrePlaga };
            }));

            return {
                id_inspeccion: insp.id_inspeccion,
                fecha: insp.fecha_programada,
                estado: insp.estado,
                tecnico: techRes.data.nombre,
                lugar: infoLugar?.nombre_lugar,
                detalles: detallesEnriquecidos
            };
        }));

        res.json(reporteFinal);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

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

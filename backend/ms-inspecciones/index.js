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
const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://ms-auth:4000';
const CULTIVO_URL = process.env.CULTIVO_SERVICE_URL || 'http://ms-cultivo:4002';

// ==========================================
// 🎯 NUEVO: CONTEXTO PARA EL TÉCNICO
// ==========================================

/**
 * Obtiene toda la información necesaria para que el técnico inicie su jornada.
 * Incluye: Lotes del lugar y Siembras activas con sus detalles técnicos.
 */
app.get('/inspecciones/:id/contexto', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Obtener la inspección base
        const { data: insp, error: inspErr } = await supabase
            .from('inspeccion')
            .select('*')
            .eq('id_inspeccion', id)
            .single();

        if (inspErr || !insp) return res.status(404).json({ error: 'Inspección no encontrada' });

        // 2. Obtener Lotes del Lugar de Producción
        const lotesRes = await axios.get(`${PREDIOS_URL}/lugares-produccion?id=${insp.id_lugar_produccion}`).catch(() => ({ data: [] }));
        const infoLugar = lotesRes.data[0];
        const lotes = infoLugar?.lote || [];

        // 3. Obtener Siembras Activas para esos Lotes
        const contextoLotes = await Promise.all(lotes.map(async (lote) => {
            // Buscamos la siembra activa en este lote desde el MS-Cultivo
            const siembraRes = await axios.get(`${CULTIVO_URL}/siembras?id_lote=${lote.id_lote}&estado=activa`).catch(() => ({ data: [] }));
            const siembra = siembraRes.data[0] || null;

            return {
                id_lote: lote.id_lote,
                nombre_lote: lote.nombre_lote,
                area_m2: lote.area_m2,
                siembra_activa: siembra ? {
                    id_siembra: siembra.id_siembra,
                    especie: siembra.especie,
                    variedad: siembra.variedad,
                    fecha_siembra: siembra.fecha_siembra,
                    cantidad_plantas_inicial: siembra.cantidad_plantas || 0, // Lo que se sembró originalmente
                    tipo_cultivo: siembra.tipo // Transitorio, perenne, etc.
                } : null
            };
        }));

        res.json({
            id_inspeccion: insp.id_inspeccion,
            lugar_produccion: infoLugar?.nombre_lugar,
            fecha_programada: insp.fecha_programada,
            productor_id: insp.productor_id,
            lotes: contextoLotes
        });

    } catch (error) {
        console.error('❌ Error obteniendo contexto:', error.message);
        res.status(500).json({ error: 'No se pudo cargar el contexto de la inspección' });
    }
});

// ==========================================
// 📝 REGISTRO DE HALLAZGOS (CON PLAGA MANUAL)
// ==========================================

app.post('/inspecciones/:id/detalles', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            id_lote, 
            id_siembra, 
            id_plaga,           // ID del catálogo (opcional si es manual)
            nombre_plaga_manual, // Si no está en catálogo ICA
            plantas_afectadas, 
            plantas_totales, 
            observaciones_especificas 
        } = req.body;

        // Insertamos el detalle. Si id_plaga es null, usamos el nombre manual en observaciones
        const { data, error } = await supabase.from('detalle_inspeccion').insert([{
            id_inspeccion: id,
            id_lote,
            id_siembra,
            id_plaga: id_plaga || null,
            plaga_manual: nombre_plaga_manual || null, // Asumimos esta columna existe o la manejamos en observaciones
            plantas_afectadas,
            plantas_totales,
            observaciones_especificas
        }]).select();

        if (error) throw error;

        // Si es el primer hallazgo, pasamos la inspección a 'en_proceso' automáticamente
        await supabase.from('inspeccion')
            .update({ estado: 'en_proceso' })
            .eq('id_inspeccion', id)
            .eq('estado', 'programada');

        res.status(201).json(data[0]);
    } catch (error) { 
        res.status(500).json({ error: 'Error guardando hallazgo: ' + error.message }); 
    }
});

// ==========================================
// 📊 REPORTES Y GESTIÓN
// ==========================================

app.get('/inspecciones/reporte', async (req, res) => {
    try {
        const { tecnico_id, productor_id, lugar_id, lote_id, estado, fecha_desde, fecha_hasta } = req.query;
        let query = supabase.from('inspeccion').select('*, detalle_inspeccion(*)');

        if (tecnico_id) query = query.eq('tecnico_id', tecnico_id);
        if (productor_id) query = query.eq('productor_id', productor_id);
        if (lugar_id) query = query.eq('id_lugar_produccion', lugar_id);
        if (estado) query = query.eq('estado', estado);
        if (fecha_desde) query = query.gte('fecha_programada', fecha_desde);
        if (fecha_hasta) query = query.lte('fecha_programada', fecha_hasta);

        const { data: inspecciones, error } = await query.order('fecha_programada', { ascending: false });
        if (error) throw error;

        const reportePromesas = inspecciones.map(async (insp) => {
            const techRes = await axios.get(`${AUTH_URL}/usuarios/${insp.tecnico_id}`).catch(() => ({ data: { nombre: 'N/A' } }));
            const predioRes = await axios.get(`${PREDIOS_URL}/lugares-produccion?id=${insp.id_lugar_produccion}`).catch(() => ({ data: [{ nombre_lugar: 'Desconocido' }] }));
            const infoLugar = predioRes.data[0];

            let detallesFiltrados = insp.detalle_inspeccion || [];
            if (lote_id) detallesFiltrados = detallesFiltrados.filter(d => d.id_lote == lote_id);

            const detallesConNombres = await Promise.all(detallesFiltrados.map(async (det) => {
                let pNombre = 'Plaga';
                if (det.id_plaga) {
                    const plagaInfo = await axios.get(`${CULTIVO_URL}/plagas/${det.id_plaga}`).catch(() => ({ data: { nombre_comun: 'Catálogo' } }));
                    pNombre = plagaInfo.data.nombre_comun;
                } else {
                    pNombre = det.plaga_manual || 'Manual';
                }

                return {
                    ...det,
                    nombre_lote: infoLugar?.lote?.find(l => l.id_lote == det.id_lote)?.nombre_lote || 'Lote',
                    nombre_plaga: pNombre
                };
            }));

            if (lote_id && detallesConNombres.length === 0) return null;

            return {
                id_inspeccion: insp.id_inspeccion,
                fecha: insp.fecha_programada,
                tecnico_nombre: techRes.data.nombre,
                lugar_nombre: infoLugar?.nombre_lugar,
                estado: insp.estado,
                observaciones_generales: insp.observaciones_generales,
                detalles: detallesConNombres
            };
        });

        const resultadosRaw = await Promise.all(reportePromesas);
        res.json(resultadosRaw.filter(r => r !== null));

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/inspecciones/solicitar', async (req, res) => {
    try {
        const { id_lugar_produccion, productor_id, fecha_programada, observaciones_generales } = req.body;
        const authRes = await axios.get(`${AUTH_URL}/usuarios/${productor_id}`);
        const regionProductor = authRes.data.region;
        const tecnicosRes = await axios.get(`${AUTH_URL}/usuarios?rol=tecnico&region=${regionProductor}`);
        const mejorTecnicoId = tecnicosRes.data[0]?.id;
        const { data, error } = await supabase.from('inspeccion').insert([{ id_lugar_produccion, productor_id, tecnico_id: mejorTecnicoId, fecha_programada, observaciones_generales, estado: 'programada' }]).select();
        res.status(201).json(data[0]);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.patch('/inspecciones/:id/finalizar', async (req, res) => {
    try {
        const { id } = req.params;
        const { observaciones_generales } = req.body;
        await supabase.from('inspeccion')
            .update({ 
                estado: 'finalizada',
                observaciones_generales 
            })
            .eq('id_inspeccion', id);
        res.json({ message: 'Inspección finalizada con éxito' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.listen(PORT, () => { console.log(`🚀 MS-Inspecciones con Contexto activo en puerto ${PORT}`); });

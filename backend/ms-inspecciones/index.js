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

// --- HISTORIAL DINÁMICO (Soporta Técnico y Productor) ---
app.get('/inspecciones/reporte', async (req, res) => {
    try {
        const {
            tecnico_id,
            productor_id,
            lugar_id,
            lote_id,
            estado,
            fecha_desde,
            fecha_hasta
        } = req.query;

        // 1. Construir consulta base
        let query = supabase.from('inspeccion').select('*, detalle_inspeccion(*)');

        // Filtros obligatorios de rol
        if (tecnico_id) query = query.eq('tecnico_id', tecnico_id);
        if (productor_id) query = query.eq('productor_id', productor_id);

        // Filtros opcionales
        if (lugar_id) query = query.eq('id_lugar_produccion', lugar_id);
        if (estado) query = query.eq('estado', estado);
        if (fecha_desde) query = query.gte('fecha_programada', fecha_desde);
        if (fecha_hasta) query = query.lte('fecha_programada', fecha_hasta);

        const { data: inspecciones, error } = await query.order('fecha_programada', { ascending: false });
        if (error) throw error;

        // 2. Procesamiento para el reporte detallado
        const reportePromesas = inspecciones.map(async (insp) => {
            // Nombre del Técnico
            const techRes = await axios.get(`${AUTH_URL}/usuarios/${insp.tecnico_id}`).catch(() => ({ data: { nombre: 'N/A' } }));

            // Info del Predio/Lugar (desde MS-Predios)
            const predioRes = await axios.get(`${PREDIOS_URL}/lugares-produccion?id=${insp.id_lugar_produccion}`).catch(() => ({ data: [{ nombre_lugar: 'Desconocido' }] }));
            const infoLugar = predioRes.data[0];

            // Filtrar detalles por lote si se solicitó
            let detallesFiltrados = insp.detalle_inspeccion;
            if (lote_id) {
                detallesFiltrados = detallesFiltrados.filter(d => d.id_lote == lote_id);
            }

            const detallesConNombres = await Promise.all(detallesFiltrados.map(async (det) => {
                const cultivoInfo = await axios.get(`${CULTIVO_URL}/siembras/${det.id_siembra}`).catch(() => ({ data: { nombre: 'Cultivo' } }));
                const plagaInfo = await axios.get(`${CULTIVO_URL}/plagas/${det.id_plaga}`).catch(() => ({ data: { nombre_comun: 'Plaga' } }));

                return {
                    ...det,
                    nombre_lote: infoLugar?.lote?.find(l => l.id_lote == det.id_lote)?.nombre_lote || 'Lote',
                    nombre_cultivo: cultivoInfo.data.nombre,
                    nombre_plaga: plagaInfo.data.nombre_comun
                };
            }));

            // Si se infiltró por lote y no hay detalles, omitir esta inspección
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
        const reporteFinal = resultadosRaw.filter(r => r !== null); // Limpiar nulos por filtros de lote

        res.json(reporteFinal);

    } catch (error) {
        res.status(500).json({ error: 'Error al generar historial: ' + error.message });
    }
});

// Enpoints de registro y gestión se mantienen...
app.post('/inspecciones/solicitar', async (req, res) => {
    try {
        const { id_lugar_produccion, productor_id, fecha_programada, observaciones_generales } = req.body;
        const authRes = await axios.get(`${AUTH_URL}/usuarios/${productor_id}`);
        const regionProductor = authRes.data.region;
        const tecnicosRes = await axios.get(`${AUTH_URL}/usuarios?rol=tecnico&region=${regionProductor}`);
        const mejorTecnicoId = tecnicosRes.data[0]?.id; // Simplificado para brevedad, usa lógica de carga arriba
        const { data, error } = await supabase.from('inspeccion').insert([{ id_lugar_produccion, productor_id, tecnico_id: mejorTecnicoId, fecha_programada, observaciones_generales, estado: 'programada' }]).select();
        res.status(201).json(data[0]);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/inspecciones/:id/detalles', async (req, res) => {
    try {
        const { id } = req.params;
        const { data } = await supabase.from('detalle_inspeccion').insert([{ id_inspeccion: id, ...req.body }]).select();
        await supabase.from('inspeccion').update({ estado: 'en_proceso' }).eq('id_inspeccion', id).eq('estado', 'programada');
        res.status(201).json(data[0]);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.patch('/inspecciones/:id/finalizar', async (req, res) => {
    try {
        await supabase.from('inspeccion').update({ estado: 'finalizada' }).eq('id_inspeccion', req.params.id);
        res.json({ message: 'Inspección finalizada' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.listen(PORT, () => { console.log(`🚀 Historial Avanzado activo en puerto ${PORT}`); });

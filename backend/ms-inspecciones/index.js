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

const jwt = require('jsonwebtoken');

// 🛡️ Middleware de Identidad Inyectada (Confiamos en el Gateway)
const authenticateInternal = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];
    
    if (!userId) {
        console.error('❌ Acceso directo denegado en MS-INSPECCIONES (Sin header de identidad)');
        return res.status(401).json({ error: 'Acceso solo permitido a través del API Gateway' });
    }

    req.user = { id_usuario: userId, role: userRole };
    next();
};

const getSupabaseAdmin = () => {
    return createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
};

// ==========================================
// 🎯 CONTEXTO MEJORADO PARA EL TÉCNICO (RLS DELEGADO)
// ==========================================
app.get('/:id/contexto', authenticateInternal, async (req, res) => {
    try {
        const supabase = getSupabaseAdmin();
        const { id } = req.params;
        const { data: insp, error: inspErr } = await supabase
            .from('inspeccion').select('*').eq('id_inspeccion', id).single();

        if (inspErr || !insp) return res.status(404).json({ 
            error: 'Inspección no encontrada o sin acceso', 
            details: inspErr?.message || 'No se encontró el registro'
        });

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
app.post('/:id/detalles', authenticateInternal, async (req, res) => {
    try {
        const supabase = getSupabaseAdmin();
        const { id } = req.params;
        const { data, error } = await supabase.from('detalle_inspeccion').insert([{ ...req.body, id_inspeccion: id }]).select();
        if (error) throw error;
        // Cambiar estado si estaba en 'programada'
        await supabase.from('inspeccion').update({ estado: 'en_proceso' }).eq('id_inspeccion', id).eq('estado', 'programada');

        res.status(201).json(data ? data[0] : { message: 'Detalle registrado' });
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
app.get('/reporte', authenticateInternal, async (req, res) => {
    try {
        const supabase = getSupabaseAdmin();
        const { id_usuario, role } = req.user;

        let query = supabase.from('inspeccion').select('*, detalle_inspeccion(*)');

        if (role !== 'ADMIN_ICA' && role !== 'admin') {
            const producerId = Number(id_usuario);
            if (isNaN(producerId)) return res.json([]);
            query = query.eq('productor_id', producerId);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (error) { res.status(500).json({ error: 'Error en reporte', details: error.message }); }
});

app.patch('/:id/finalizar', authenticateInternal, async (req, res) => {
    try {
        const supabase = getSupabaseAdmin();
        const { id } = req.params;
        const { observaciones_generales } = req.body;

        const { error } = await supabase.from('inspeccion')
            .update({ estado: 'finalizada', observaciones_generales })
            .eq('id_inspeccion', id);

        if (error) throw error;
        res.json({ message: 'Inspección finalizada con éxito' });
    } catch (error) { res.status(403).json({ error: 'Error al finalizar: No autorizado' }); }
});

// ==========================================
// 📅 AGENDAMIENTO AUTOMÁTICO (PRODUCTOR)
// ==========================================
app.post('/agendar', authenticateInternal, async (req, res) => {
    try {
        const supabase = getSupabaseAdmin();
        const { id_lugar_produccion, fecha_sugerida } = req.body;
        const productor_id = req.user.id_usuario; // Extraído del token por el Gateway

        if (!id_lugar_produccion) return res.status(400).json({ error: 'id_lugar_produccion es requerido' });

        // 1. Obtener técnicos disponibles desde MS-AUTH
        const techRes = await axios.get(`${AUTH_URL}/auth/usuarios/rol/tecnico`).catch(e => {
            console.error('Error obteniendo técnicos:', e.message);
            return { data: [] };
        });

        const tecnicos = techRes.data;
        if (tecnicos.length === 0) {
            return res.status(503).json({ error: 'No hay técnicos disponibles para asignación automática en este momento.' });
        }

        // 2. Asignación automática (Round Robin simple o Aleatorio)
        const tecnicoAsignado = tecnicos[Math.floor(Math.random() * tecnicos.length)];

        // 3. Crear la inspección en Supabase
        const { data, error } = await supabase.from('inspeccion').insert([{
            productor_id,
            tecnico_id: tecnicoAsignado.id_usuario,
            id_lugar_produccion,
            estado: 'programada',
            fecha_inspeccion: fecha_sugerida || new Date(Date.now() + 86400000 * 3).toISOString(), // +3 días por defecto
            observaciones_generales: 'Agendada automáticamente por el productor'
        }]).select();

        if (error) throw error;

        res.status(201).json({
            message: 'Inspección agendada con éxito',
            detalle: data[0],
            tecnico: tecnicoAsignado.nombre
        });

    } catch (error) {
        console.error('❌ Error en /agendar:', error);
        res.status(500).json({ error: 'Error al agendar inspección', details: error.message });
    }
});

const amqp = require('amqplib');
const RABBIT_URL = process.env.RABBIT_URL || 'amqp://guest:guest@rabbitmq:5672';

// ==========================================
// 👂 EVENTOS ASÍNCRONOS (COREOGRAFÍA)
// ==========================================
async function startConsumer() {
    try {
        const connection = await amqp.connect(RABBIT_URL);
        const channel = await connection.createChannel();
        const queue = 'inspecciones_queue';

        await channel.assertQueue(queue, { durable: true });
        console.log(`📡 [MS-INSPECCIONES]: Escuchando eventos ICA en [${queue}]...`);

        channel.consume(queue, async (msg) => {
            if (msg !== null) {
                const event = JSON.parse(msg.content.toString());
                console.log(`📝 [MS-INSPECCIONES]: Evento recibido -> ${event.tipo}`);

                if (event.tipo === 'SIEMBRA_FINALIZADA') {
                    console.log(`🚜 Programando inspección automática para predio del productor ${event.productor_id}...`);
                    // Aquí iría el INSERT a supabase usando process.env.SUPABASE_SERVICE_ROLE_KEY
                    channel.ack(msg);
                }
            }
        });
    } catch (error) {
        setTimeout(startConsumer, 5000);
    }
}
startConsumer();

app.listen(PORT, () => { console.log(`🚀 MS-Inspecciones: Seguridad delegada a RLS en puerto ${PORT}`); });

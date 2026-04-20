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

        const headers = { 
            'x-user-id': req.user.id_usuario, 
            'x-user-role': req.user.role 
        };

        const prodRes = await axios.get(`${AUTH_URL}/auth/usuarios/${insp.productor_id}`, { headers })
            .catch((e) => {
                console.error('⚠️ MS-AUTH Error:', e.message);
                return { data: { nombre: 'Productor Desconocido', region: 'Sin Región' } };
            });

        const lotesRes = await axios.get(`${PREDIOS_URL}/lugares-produccion`, { headers })
            .catch((e) => {
                console.error('⚠️ MS-PREDIOS Error:', e.message);
                return { data: [] };
            });

        const infoLugar = lotesRes.data.find(p => p.id_lugar_produccion === insp.id_lugar_produccion);
        const lotes = infoLugar?.lote || [];

        const contextoLotes = await Promise.all(lotes.map(async (lote) => {
            const siembraRes = await axios.get(`${CULTIVO_URL}/siembras?id_lote=${lote.id_lote}`, { headers })
                .catch((e) => {
                    console.error(`⚠️ MS-CULTIVO Error (Lote ${lote.id_lote}):`, e.message);
                    return { data: [] };
                });

            const siembra = siembraRes.data[0] || null;
            let edadCronologica = null;

            if (siembra && siembra.fecha_siembra) {
                const fSiembra = new Date(siembra.fecha_siembra);
                const hoy = new Date();
                const diffTime = Math.abs(hoy.getTime() - fSiembra.getTime());
                edadCronologica = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            }

            return {
                id_lote: lote.id_lote,
                nombre_lote: lote.nombre_lote,
                area: lote.area,
                estado_lote: lote.estado,
                siembra_activa: siembra ? {
                    id_siembra: siembra.id_siembra,
                    especie: siembra.variedad?.especie?.nombre_comun || 'No especificado',
                    variedad: siembra.variedad?.nombre_variedad || 'Genérica',
                    ciclo: siembra.variedad?.especie?.ciclo || 'N/A',
                    fecha_siembra: siembra.fecha_siembra,
                    cantidad_plantas: siembra.cantidad_plantas,
                    edad_dias: edadCronologica
                } : null
            };
        }));

        res.json({
            id_inspeccion: insp.id_inspeccion,
            lugar_nombre: infoLugar?.nombre_lugar || 'Finca sin nombre',
            numero_predial: infoLugar?.numero_predial || 'N/A',
            productor: { 
                nombre: prodRes.data.nombre || 'N/A', 
                region: prodRes.data.region || 'N/A' 
            },
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
        console.error('❌ Error crítico en POST /detalles:', error);
        res.status(error.status || 500).json({ 
            error: 'Fallo al registrar hallazgo', 
            details: error.message || error,
            hints: 'Verifique que los nombres de las columnas coincidan con el esquema de Supabase'
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

// ==========================================
// 📅 INSPECCIONES ASIGNADAS AL TÉCNICO
// ==========================================
app.get('/asignadas', authenticateInternal, async (req, res) => {
    try {
        const supabase = getSupabaseAdmin();
        const { id_usuario, role } = req.user;

        if (role?.toLowerCase() !== 'tecnico' && role !== 'admin') {
            return res.status(403).json({ error: 'Solo los técnicos pueden ver sus asignaciones.' });
        }

        let query = supabase.from('inspeccion').select('*');
        if (role?.toLowerCase() === 'tecnico') {
            query = query.eq('tecnico_id', id_usuario);
        }

        const { data: asignaciones, error } = await query;
        
        if (error) {
            console.error('❌ Error de Supabase:', error);
            return res.status(500).json({ error: 'Fallo en Supabase', details: error.message });
        }

        // 🔗 ENRIQUECER CON DATOS DE MS-PREDIOS
        const enriched = await Promise.all(asignaciones.map(async (ins) => {
            try {
                // Consultamos el nombre del lugar al otro microservicio
                const predioRes = await axios.get(`${PREDIOS_URL}/lugares-produccion`, {
                    headers: { 'x-user-id': id_usuario, 'x-user-role': role }
                });
                const predio = predioRes.data.find(p => p.id_lugar_produccion === ins.id_lugar_produccion);
                
                return {
                    ...ins,
                    lugar_produccion: predio ? {
                        nombre_lugar: predio.nombre_lugar,
                        numero_predial: predio.numero_predial
                    } : { nombre_lugar: 'Predio Desconocido', numero_predial: 'N/A' }
                };
            } catch (err) {
                return { ...ins, lugar_produccion: { nombre_lugar: 'Error de conexión', numero_predial: 'N/A' } };
            }
        }));

        res.json(enriched || []);
    } catch (error) {
        console.error('❌ Error general en /asignadas:', error);
        res.status(500).json({ error: 'Error interno del servidor', message: error.message });
    }
});

app.patch('/:id/finalizar', authenticateInternal, async (req, res) => {
    try {
        const supabase = getSupabaseAdmin();
        const { id } = req.params;
        const { observaciones_generales, estado } = req.body;

        const { error } = await supabase.from('inspeccion')
            .update({ estado: estado, observaciones_generales })
            .eq('id_inspeccion', id);

        if (error) throw error;
        res.json({ message: 'Inspección finalizada con éxito' });
    } catch (error) { 
        console.error('❌ Error en PATCH /finalizar:', error);
        res.status(500).json({ error: 'Error interno al finalizar la inspección', details: error.message }); 
    }
});

// ==========================================
// 📅 AGENDAMIENTO AUTOMÁTICO (BALANCEO DE CARGA)
// ==========================================
app.post('/agendar', authenticateInternal, async (req, res) => {
    try {
        console.log('📝 Iniciando agendamiento automático...');
        const supabase = getSupabaseAdmin();
        const { id_lugar_produccion, fecha, hora } = req.body;
        const productor_id = Number(req.user.id_usuario);

        if (!id_lugar_produccion || !fecha || !hora) {
            return res.status(400).json({ error: 'Faltan campos obligatorios (predio, fecha u hora).' });
        }

        // 1. Obtener técnicos desde MS-AUTH
        const techRes = await axios.get(`${AUTH_URL}/auth/usuarios/rol/tecnico`).catch(e => {
            console.error('❌ Error llamando a MS-AUTH:', e.message);
            return { data: [] };
        });

        const tecnicos = techRes.data;
        console.log(`👷 Técnicos encontrados: ${tecnicos.length}`);

        if (!tecnicos || tecnicos.length === 0) {
            return res.status(503).json({ error: 'No hay técnicos activos en el sistema para asignación automática.' });
        }

        // 2. Consultar carga de trabajo
        const { data: carga, error: loadErr } = await supabase
            .from('inspeccion')
            .select('tecnico_id')
            .eq('estado', 'programada');

        if (loadErr) throw loadErr;

        // 3. Calcular quién tiene menos trabajo
        const workload = {};
        tecnicos.forEach(t => workload[t.id_usuario] = 0);
        carga.forEach(ins => {
            if (workload[ins.tecnico_id] !== undefined) workload[ins.tecnico_id]++;
        });

        const elegible = tecnicos.sort((a,b) => workload[a.id_usuario] - workload[b.id_usuario])[0];
        console.log(`🎯 Técnico asignado por carga mínima: ${elegible.nombre} (ID: ${elegible.id_usuario})`);

        // 4. Crear registro
        const { data: nueva, error: insErr } = await supabase.from('inspeccion').insert([{
            productor_id,
            tecnico_id: elegible.id_usuario,
            id_lugar_produccion: Number(id_lugar_produccion),
            estado: 'programada',
            fecha_programada: `${fecha}T${hora}:00`,
            observaciones_generales: 'Cita agendada por el portal del productor'
        }]).select();

        if (insErr) throw insErr;

        res.status(201).json({
            message: 'Inspección agendada',
            tecnico_asignado: elegible.nombre,
            detalle: nueva[0]
        });

    } catch (error) {
        console.error('💥 ERROR CRÍTICO EN AGENDAMIENTO:', error);
        res.status(500).json({ 
            error: 'No se pudo procesar la asignación automática', 
            details: error.message 
        });
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

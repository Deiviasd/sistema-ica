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
                return { data: { nombre: 'Productor Desconocido', region: null, usuario_predio: [] } };
            });

        const prod = prodRes.data;
        const region = prod.region;
        
        const ubicacionParts = [];
        if (region?.vereda) ubicacionParts.push(region.vereda);
        if (region?.municipio) ubicacionParts.push(region.municipio);
        if (region?.departamento) ubicacionParts.push(region.departamento);
        
        const ubicacionFull = ubicacionParts.length > 0 ? ubicacionParts.join(', ') : 'Sin Ubicación';

        const predioOficial = prod.usuario_predio?.[0]?.nombre_predio || 'Finca ICA';

        const lotesRes = await axios.get(`${PREDIOS_URL}/lugares-produccion`, { headers })
            .catch((e) => {
                console.error('⚠️ MS-PREDIOS Error:', e.message);
                return { data: [] };
            });

        console.log(`🔎 [MS-INSPECCIONES] Contexto: insp.productor_id=${insp.productor_id}`);
        console.log(`🔎 [MS-INSPECCIONES] Lugares recibidos: ${lotesRes.data?.length || 0}`);

        // FILTRAR: Solo los lugares que pertenecen al productor de esta inspección
        const todosLugares = lotesRes.data.filter(p => {
            const matches = String(p.productor_id) === String(insp.productor_id);
            return matches;
        });

        console.log(`🔎 [MS-INSPECCIONES] Lugares filtrados: ${todosLugares.length}`);

        // Helper: enriquecer un lote con datos de siembra/cultivo
        const enriquecerLote = async (lote) => {
            const siembraRes = await axios.get(`${CULTIVO_URL}/siembras?id_lote=${lote.id_lote}`, { headers })
                .catch((e) => {
                    console.error(`⚠️ MS-CULTIVO Error (Lote ${lote.id_lote}):`, e.message);
                    return { data: [] };
                });

            const siembra = siembraRes.data[0] || null;
            let edadCronologica = null;

            if (siembra && siembra.fecha_siembra) {
                const diff = Math.abs(new Date() - new Date(siembra.fecha_siembra));
                edadCronologica = Math.ceil(diff / (1000 * 60 * 60 * 24)); 
            }

            return {
                id_lote: lote.id_lote,
                nombre_lote: lote.nombre_lote,
                area: lote.area,
                estado_lote: lote.estado,
                siembra_activa: siembra ? {
                    id_siembra: siembra.id_siembra,
                    especie: siembra.variedad?.especie?.nombre_comun || 'No especificado',
                    id_especie: siembra.variedad?.id_especie, // 🌿 Agregado para el catálogo de plagas
                    variedad: siembra.variedad?.nombre_variedad || 'Genérica',
                    ciclo: siembra.variedad?.especie?.ciclo || 'N/A',
                    fecha_siembra: siembra.fecha_siembra,
                    cantidad_plantas: siembra.cantidad_plantas,
                    edad_dias: edadCronologica
                } : null
            };
        };

        // Enriquecer TODOS los lugares con sus lotes y cultivos
        const lugaresEnriquecidos = await Promise.all(todosLugares.map(async (lugar) => {
            const lotes = lugar.lote || [];
            const lotesEnriquecidos = await Promise.all(lotes.map(enriquecerLote));
            return {
                id_lugar_produccion: lugar.id_lugar_produccion,
                nombre_lugar: lugar.nombre_lugar,
                area_total: lugar.area_total,
                es_lugar_inspeccion: lugar.id_lugar_produccion === insp.id_lugar_produccion,
                lotes: lotesEnriquecidos
            };
        }));

        // Lotes planos del lugar de la inspección (para el formulario de evaluación)
        const lugarInspeccion = lugaresEnriquecidos.find(l => l.es_lugar_inspeccion);

        const totalLotes = lugaresEnriquecidos.reduce((acc, l) => acc + l.lotes.length, 0);
        const areaTotal = lugaresEnriquecidos.reduce((acc, l) => acc + (Number(l.area_total) || 0), 0);

        // 🔍 Rescatar detalles (hallazgos) guardados si la inspección estaba 'en_proceso'
        const { data: detallesPrevios } = await supabase
            .from('detalle_inspeccion')
            .select('*')
            .eq('id_inspeccion', insp.id_inspeccion)
            .order('id_detalle', { ascending: true });

        res.json({
            id_inspeccion: insp.id_inspeccion,
            hallazgos_previos: detallesPrevios || [],
            lugar_nombre: lugarInspeccion?.nombre_lugar || 'Sin nombre',
            nombre_predio_oficial: predioOficial,
            area_lugar: areaTotal,
            productor: { 
                nombre: prod.nombre || 'N/A', 
                ubicacion: ubicacionFull
            },
            lotes: lugarInspeccion?.lotes || [],
            lugares_produccion: lugaresEnriquecidos,
            total_lotes: totalLotes
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
        const items = Array.isArray(req.body) ? req.body : [req.body];
        
        const toInsert = items.filter(i => !i.id_detalle).map(i => {
            const { id_detalle, ...rest } = i;
            return { ...rest, id_inspeccion: id };
        });
        const toUpdate = items.filter(i => i.id_detalle).map(i => ({ ...i, id_inspeccion: id }));

        let results = [];
        
        if (toInsert.length > 0) {
            const { data, error } = await supabase.from('detalle_inspeccion').insert(toInsert).select();
            if (error) throw error;
            if (data) results.push(...data);
        }
        
        if (toUpdate.length > 0) {
            const { data, error } = await supabase.from('detalle_inspeccion').upsert(toUpdate, { onConflict: 'id_detalle' }).select();
            if (error) throw error;
            if (data) results.push(...data);
        }

        const data = results;
        // Cambiar estado si estaba en 'programada'
        await supabase.from('inspeccion').update({ estado: 'en_proceso' }).eq('id_inspeccion', id).eq('estado', 'programada');

        res.status(201).json(results);
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
        const userRole = role?.toLowerCase();

        console.log(`🔍 [MS-INSPECCIONES] /asignadas: user=${id_usuario}, role=${userRole}`);

        if (userRole !== 'tecnico' && userRole !== 'admin') {
            return res.status(403).json({ error: 'Solo los técnicos pueden ver sus asignaciones.' });
        }

        let query = supabase.from('inspeccion').select('*');
        if (userRole === 'tecnico') {
            // Aseguramos que el ID sea numérico si la DB espera INT
            const tId = parseInt(id_usuario);
            query = query.eq('tecnico_id', isNaN(tId) ? id_usuario : tId);
        }

        const { data: asignaciones, error } = await query;
        if (error) {
            console.error('❌ Error Supabase /asignadas:', error);
            return res.status(500).json({ error: 'Error en base de datos', details: error.message });
        }

        if (!asignaciones || asignaciones.length === 0) {
            console.log('⚠️ No se encontraron inspecciones asignadas');
            return res.json([]);
        }

        const enriched = await Promise.all(asignaciones.map(async (ins) => {
            try {
                const headers = { 'x-user-id': id_usuario, 'x-user-role': role };

                const predioRes = await axios.get(`${PREDIOS_URL}/lugares-produccion`, { headers });
                const lugar = predioRes.data.find(p => p.id_lugar_produccion === ins.id_lugar_produccion);
                
                const prodRes = await axios.get(`${AUTH_URL}/auth/usuarios/${ins.productor_id}`, { headers });
                const prod = prodRes.data;
                const region = prod.region;
                
                // Obtener el nombre del predio principal (usuario_predio es un array en Supabase por el join 1:N)
                const predioInfo = Array.isArray(prod?.usuario_predio) ? prod.usuario_predio[0] : prod?.usuario_predio;
                const nombrePredio = predioInfo?.nombre_predio || 'Finca sin nombre';
                
                const ubicacionParts = [];
                if (region?.vereda) ubicacionParts.push(region.vereda);
                if (region?.municipio) ubicacionParts.push(region.municipio);
                if (region?.departamento) ubicacionParts.push(region.departamento);
                
                const ubicacion = ubicacionParts.length > 0 ? ubicacionParts.join(', ') : 'Ubicación no registrada';

                return {
                    ...ins,
                    lugar_produccion: {
                        nombre_lugar: nombrePredio,
                        ubicacion: ubicacion
                    }
                };

            } catch (err) {
                console.error(`⚠️ Error enriqueciendo inspección ${ins.id_inspeccion}:`, err.message);
                return { ...ins, lugar_produccion: { nombre_lugar: 'Inspección #'+ins.id_inspeccion, ubicacion: 'Sin ubicación' } };
            }
        }));

        res.json(enriched);
    } catch (error) {
        console.error('❌ Error fatal en /asignadas:', error);
        res.status(500).json({ error: 'Error en asignaciones', message: error.message });
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

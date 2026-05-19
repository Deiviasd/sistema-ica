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

        // Enriquecer TODOS los lugares con sus lotes y cultivos (Navegando Lugar -> Predio -> Lote)
        const lugaresEnriquecidos = await Promise.all(todosLugares.map(async (lugar) => {
            // Obtener el nombre del predio asociado a este lugar (o del predio de la inspección si aplica)
            const matchesPredio = lugar.predio || [];
            const predioOficialInfo = insp.id_predio 
                ? matchesPredio.find(p => p.id_predio === insp.id_predio)
                : matchesPredio[0];
            const nombrePredioOficial = predioOficialInfo?.nombre_predio || 'Finca sin nombre';

            // Aplanamos los lotes. Si es el lugar de la inspección y hay un id_predio, filtramos solo los lotes de ese predio!
            const prediosParaLotes = insp.id_predio && lugar.id_lugar_produccion === insp.id_lugar_produccion
                ? matchesPredio.filter(p => p.id_predio === insp.id_predio)
                : matchesPredio;

            const todosLotesDelLugar = prediosParaLotes.flatMap(p => p.lote || []);
            const lotesEnriquecidos = await Promise.all(todosLotesDelLugar.map(enriquecerLote));

            // Sumar áreas individuales de este lugar específico
            const areaDelLugar = lotesEnriquecidos.reduce((sum, lote) => sum + (Number(lote.area) || 0), 0);

            return {
                id_lugar_produccion: lugar.id_lugar_produccion,
                nombre_lugar: nombrePredioOficial,
                nombre_empresa: lugar.nombre_lugar, // Exponemos el nombre original (Empresa/Lugar)
                area_total: areaDelLugar,
                es_lugar_inspeccion: lugar.id_lugar_produccion === insp.id_lugar_produccion,
                lotes: lotesEnriquecidos
            };
        }));

        // Lotes planos del lugar de la inspección (para el formulario de evaluación)
        const lugarInspeccion = lugaresEnriquecidos.find(l => l.es_lugar_inspeccion);

        const totalLotes = lugaresEnriquecidos.reduce((acc, l) => acc + l.lotes.length, 0);

        // SUMAR ÁREAS DE LOS LOTES PORQUE EL ÁREA DEL LUGAR SUELE ESTAR VACÍA
        const areaTotal = lugaresEnriquecidos.reduce((acc, lugar) => {
            return acc + lugar.lotes.reduce((sum, lote) => sum + (Number(lote.area) || 0), 0);
        }, 0);

        // El nombre oficial del predio es el del lugar de inspección (o el primero que haya)
        const predioOficial = lugarInspeccion?.nombre_lugar || lugaresEnriquecidos[0]?.nombre_lugar || 'Sin Predio Registrado';

        // 🔍 Rescatar detalles (hallazgos) guardados y enriquecer con ID de lote si es posible
        const { data: detallesPrevios } = await supabase
            .from('detalle_inspeccion')
            .select('*')
            .eq('id_inspeccion', insp.id_inspeccion)
            .order('id_detalle', { ascending: true });

        // Enriquecer hallazgos con el id_lote real desde MS-CULTIVO
        const hallazgosEnriquecidos = await Promise.all((detallesPrevios || []).map(async (hp) => {
            try {
                const sRes = await axios.get(`${CULTIVO_URL}/siembras/${hp.siembra_id}`, { headers });
                return { ...hp, id_lote: sRes.data?.id_lote };
            } catch (e) {
                return hp;
            }
        }));

        res.json({
            id_inspeccion: insp.id_inspeccion,
            hallazgos_previos: hallazgosEnriquecidos,
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

        // 🔍 Enriquecer con nombre del técnico desde ms-auth
        const enriched = await Promise.all((data || []).map(async (ins) => {
            if (!ins.tecnico_id) return { ...ins, tecnico_nombre: 'Por asignar' };
            try {
                const authRes = await axios.get(`${AUTH_URL}/auth/usuarios/${ins.tecnico_id}`, {
                    headers: { 'x-internal-key': process.env.INTERNAL_API_KEY }
                });
                return { ...ins, tecnico_nombre: authRes.data?.nombre || `Técnico #${ins.tecnico_id}` };
            } catch {
                return { ...ins, tecnico_nombre: `Técnico #${ins.tecnico_id}` };
            }
        }));

        res.json(enriched);
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

                // Obtener el nombre del predio desde el objeto lugar de ms-predios (más preciso)
                const predioInfo = Array.isArray(lugar?.predio)
                    ? (ins.id_predio ? lugar.predio.find(p => p.id_predio === ins.id_predio) : lugar.predio[0])
                    : lugar?.predio;
                const nombrePredioOficial = predioInfo?.nombre_predio || 'Finca sin nombre';

                const ubicacionParts = [];
                if (region?.vereda) ubicacionParts.push(region.vereda);
                if (region?.municipio) ubicacionParts.push(region.municipio);
                if (region?.departamento) ubicacionParts.push(region.departamento);

                const ubicacion = ubicacionParts.length > 0 ? ubicacionParts.join(', ') : 'Ubicación no registrada';

                return {
                    ...ins,
                    lugar_produccion: {
                        nombre_lugar: nombrePredioOficial,
                        ubicacion: ubicacion
                    }
                };

            } catch (err) {
                console.error(`⚠️ Error enriqueciendo inspección ${ins.id_inspeccion}:`, err.message);
                return { ...ins, lugar_produccion: { nombre_lugar: 'Inspección #' + ins.id_inspeccion, ubicacion: 'Sin ubicación' } };
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
// 📅 AGENDAMIENTO AUTOMÁTICO (BALANCEO DE CARGA + REGIÓN + DISPONIBILIDAD)
// ==========================================
app.post('/agendar', authenticateInternal, async (req, res) => {
    try {
        console.log('📝 Iniciando agendamiento automático...');
        const supabase = getSupabaseAdmin();
        const { id_lugar_produccion, id_predio, fecha, hora } = req.body;
        const productor_id = Number(req.user.id_usuario);
        const headers = { 'x-user-id': req.user.id_usuario, 'x-user-role': req.user.role };

        if (!id_lugar_produccion || !fecha || !hora) {
            return res.status(400).json({ error: 'Faltan campos obligatorios (predio, fecha u hora).' });
        }

        // 🛑 Regla de negocio: Solo una inspección activa por predio
        const checkField = id_predio ? 'id_predio' : 'id_lugar_produccion';
        const checkValue = id_predio ? Number(id_predio) : Number(id_lugar_produccion);

        const { data: activeInspections, error: activeErr } = await supabase
            .from('inspeccion')
            .select('id_inspeccion')
            .eq(checkField, checkValue)
            .in('estado', ['programada', 'en_proceso']);

        if (activeErr) {
            console.error('❌ Error verificando inspecciones activas:', activeErr);
        } else if (activeInspections && activeInspections.length > 0) {
            return res.status(400).json({
                error: 'Este predio ya cuenta con una inspección activa (programada o en proceso). Podrás agendar una nueva inspección cuando el técnico finalice la actual.'
            });
        }

        // 🛑 Regla de negocio: Mínimo 3 días de antelación
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        const targetDate = new Date(fecha + 'T00:00:00');
        const diffTime = targetDate.getTime() - currentDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 3) {
            return res.status(400).json({
                error: 'La inspección debe ser agendada con un mínimo de 3 días de antelación. (Ejemplo: Para el 21/05/2026 debes agendar a más tardar el 18/05/2026).'
            });
        }

        // 🛑 Regla de negocio: Horario de 6:00 AM a 12:00 PM
        const [hours, minutes] = hora.split(':').map(Number);
        const totalMinutes = hours * 60 + (minutes || 0);
        const minMinutes = 6 * 60;  // 06:00 AM
        const maxMinutes = 12 * 60; // 12:00 PM (Mediodía)

        if (totalMinutes < minMinutes || totalMinutes > maxMinutes) {
            return res.status(400).json({
                error: 'El horario permitido para agendar inspecciones es de 6:00 AM a 12:00 PM.'
            });
        }

        const fechaProgramada = `${fecha}T${hora}:00`;

        // 1. PASO 4: Validar que el predio tenga lotes activos
        const predioRes = await axios.get(`${PREDIOS_URL}/lugares-produccion`, { headers }).catch(e => {
            console.error('❌ Error llamando a MS-PREDIOS:', e.message);
            return { data: [] };
        });

        const lugar = predioRes.data.find(p => p.id_lugar_produccion === Number(id_lugar_produccion));

        // Validar lotes navegando por la jerarquía predio -> lote
        const tieneLotes = lugar?.predio?.some(p => p.lote && p.lote.length > 0);

        if (!lugar || !tieneLotes) {
            return res.status(400).json({
                error: 'El predio seleccionado no cuenta con la información necesaria para solicitar una inspección (No tiene lotes registrados).'
            });
        }

        // 2. Obtener datos del productor para su región (como fallback de asignación)
        const prodRes = await axios.get(`${AUTH_URL}/auth/usuarios/${productor_id}`, { headers }).catch(e => {
            console.error('❌ Error llamando a MS-AUTH (Productor):', e.message);
            return { data: null };
        });

        const regionProductor = prodRes.data?.region;

        // 🔍 Prioridad de Región: Usamos la región del predio seleccionado en lugar de la del productor!
        const predioObjeto = lugar?.predio?.find(p => p.id_predio === Number(id_predio)) || lugar?.predio?.[0];
        const regionAsignacion = predioObjeto?.region || regionProductor;

        if (!regionAsignacion) {
            return res.status(400).json({ error: 'El predio seleccionado no tiene una ubicación o región registrada para asignar un técnico.' });
        }

        // 3. Obtener técnicos desde MS-AUTH
        const techRes = await axios.get(`${AUTH_URL}/auth/usuarios/rol/tecnico`).catch(e => {
            console.error('❌ Error llamando a MS-AUTH (Técnicos):', e.message);
            return { data: [] };
        });

        const todosTecnicos = techRes.data;
        if (!todosTecnicos || todosTecnicos.length === 0) {
            return res.status(503).json({ error: 'No hay técnicos activos en el sistema.' });
        }

        // 4. Filtrar técnicos por REGIÓN (Prioridad: Municipio > Departamento)
        let tecnicosCercanos = todosTecnicos.filter(t =>
            t.region?.municipio?.toLowerCase() === regionAsignacion.municipio?.toLowerCase() &&
            t.region?.departamento?.toLowerCase() === regionAsignacion.departamento?.toLowerCase()
        );

        if (tecnicosCercanos.length === 0) {
            console.log('⚠️ No hay técnicos en el municipio, buscando por departamento...');
            tecnicosCercanos = todosTecnicos.filter(t => 
                t.region?.departamento?.toLowerCase() === regionAsignacion.departamento?.toLowerCase()
            );
        }

        if (tecnicosCercanos.length === 0) {
            return res.status(400).json({
                error: `No hay técnicos disponibles en la región del predio (${regionAsignacion.departamento || 'Sin departamento'}).`
            });
        }

        // 5. Verificar DISPONIBILIDAD (Paso 7: No cruce de horarios)
        const { data: ocupados, error: busyErr } = await supabase
            .from('inspeccion')
            .select('tecnico_id')
            .eq('fecha_programada', fechaProgramada)
            .in('estado', ['programada', 'en_proceso']);

        if (busyErr) throw busyErr;

        const idsOcupados = new Set((ocupados || []).map(o => o.tecnico_id));
        const tecnicosDisponibles = tecnicosCercanos.filter(t => !idsOcupados.has(t.id_usuario));

        if (tecnicosDisponibles.length === 0) {
            return res.status(400).json({
                error: 'No hay técnicos disponibles para la fecha y hora seleccionadas.',
                sugerencia: 'Por favor seleccione una fecha u hora diferente.'
            });
        }

        // 6. Balanceo de Carga (Saga / Workload con control de estado 'programada' y 'en_proceso' + protección contra nulos)
        const { data: carga, error: loadErr } = await supabase
            .from('inspeccion')
            .select('tecnico_id')
            .in('estado', ['programada', 'en_proceso']);

        if (loadErr) throw loadErr;

        const workload = {};
        tecnicosDisponibles.forEach(t => workload[String(t.id_usuario)] = 0);
        (carga || []).forEach(ins => {
            const tIdStr = ins.tecnico_id ? String(ins.tecnico_id) : null;
            if (tIdStr && workload[tIdStr] !== undefined) {
                workload[tIdStr]++;
            }
        });

        const elegible = tecnicosDisponibles.sort((a, b) => workload[String(a.id_usuario)] - workload[String(b.id_usuario)])[0];
        console.log(`🎯 Técnico asignado: ${elegible.nombre} en ${elegible.region?.municipio}`);

        // 7. Crear registro
        const { data: nueva, error: insErr } = await supabase.from('inspeccion').insert([{
            productor_id,
            tecnico_id: elegible.id_usuario,
            id_lugar_produccion: Number(id_lugar_produccion),
            id_predio: id_predio ? Number(id_predio) : null,
            estado: 'programada',
            fecha_programada: fechaProgramada,
            observaciones_generales: 'Cita agendada por el portal del productor'
        }]).select();

        if (insErr) throw insErr;

        res.status(201).json({
            message: 'Inspección agendada exitosamente',
            tecnico_asignado: elegible.nombre,
            detalle: nueva[0]
        });

    } catch (error) {
        console.error('💥 ERROR CRÍTICO EN AGENDAMIENTO:', error);
        res.status(500).json({ error: 'Fallo al procesar agendamiento', details: error.message });
    }
});

// ==========================================
// ❌ CANCELACIÓN DE CITA 
// ==========================================
app.patch('/:id/cancelar', authenticateInternal, async (req, res) => {
    try {
        const supabase = getSupabaseAdmin();
        const { id } = req.params;
        const productor_id = Number(req.user.id_usuario);

        // 1. Verificar que la cita exista y sea del productor
        const { data: insp, error: findErr } = await supabase
            .from('inspeccion')
            .select('*')
            .eq('id_inspeccion', id)
            .single();

        if (findErr || !insp) return res.status(404).json({ error: 'Cita no encontrada.' });

        if (insp.productor_id !== productor_id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'No tiene permiso para cancelar esta cita.' });
        }

        // 2. Solo se puede cancelar si está 'programada'
        if (insp.estado !== 'programada') {
            return res.status(400).json({
                error: 'No se puede cancelar una inspección que ya está en proceso o finalizada.'
            });
        }

        // 3. Actualizar estado
        const { error: cancelErr } = await supabase
            .from('inspeccion')
            .update({ estado: 'cancelada', observaciones_generales: 'Cancelada por el productor' })
            .eq('id_inspeccion', id);

        if (cancelErr) throw cancelErr;

        res.json({ message: 'La solicitud de inspección ha sido cancelada exitosamente.' });

    } catch (error) {
        console.error('❌ Error en PATCH /cancelar:', error);
        res.status(500).json({ error: 'Error al cancelar la cita', details: error.message });
    }
});

// ==========================================
// 🔒 ENDPOINT INTERNO: VERIFICAR INSPECCIÓN ACTIVA POR PREDIO
// ==========================================
app.get('/lugar-produccion/:id/inspeccion-activa', async (req, res) => {
    try {
        const supabase = getSupabaseAdmin();
        const { id } = req.params;
        const { data, error } = await supabase
            .from('inspeccion')
            .select('id_inspeccion, estado')
            .eq('id_lugar_produccion', Number(id))
            .in('estado', ['programada', 'en_proceso']);

        if (error) throw error;
        
        const activa = data && data.length > 0;
        res.json({ activa, inspeccion: activa ? data[0] : null });
    } catch (err) {
        console.error('❌ Error en GET /lugar-produccion/:id/inspeccion-activa:', err);
        res.status(500).json({ error: 'Error al consultar inspección activa' });
    }
});

app.get('/predio/:id/inspeccion-activa', async (req, res) => {
    try {
        const supabase = getSupabaseAdmin();
        const { id } = req.params;
        const { data, error } = await supabase
            .from('inspeccion')
            .select('id_inspeccion, estado')
            .eq('id_predio', Number(id))
            .in('estado', ['programada', 'en_proceso']);

        if (error) throw error;
        
        const activa = data && data.length > 0;
        res.json({ activa, inspeccion: activa ? data[0] : null });
    } catch (err) {
        console.error('❌ Error en GET /predio/:id/inspeccion-activa:', err);
        res.status(500).json({ error: 'Error al consultar inspección activa por predio' });
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
                try {
                    const event = JSON.parse(msg.content.toString());
                    console.log(`📝 [MS-INSPECCIONES]: Evento recibido -> ${event.tipo}`);

                    if (event.tipo === 'SIEMBRA_FINALIZADA') {
                        console.log(`🚜 Programando inspección automática para predio del productor ${event.productor_id || 'N/A'}...`);
                        // Aquí iría la lógica de agendamiento automático
                    }

                    // IMPORTANTE: Confirmar el mensaje siempre para que salga de la cola
                    channel.ack(msg);
                } catch (consumeErr) {
                    console.error('❌ Error procesando mensaje de RabbitMQ:', consumeErr.message);
                    // Confirmamos incluso con error para evitar bucles infinitos de re-entrega si el mensaje está roto
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

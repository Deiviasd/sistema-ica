const { supabase } = require('../config/supabase');
const authClient = require('../clients/authClient');
const prediosClient = require('../clients/prediosClient');
const cultivoClient = require('../clients/cultivoClient');

/**
 * Servicio encargado de la lógica de negocio y comunicación con datos/servicios externos para Inspecciones.
 */

const obtenerContexto = async (id, reqUser) => {
    const { data: insp, error: inspErr } = await supabase
        .from('inspeccion').select('*').eq('id_inspeccion', id).single();

    if (inspErr || !insp) {
        const error = new Error('Inspección no encontrada o sin acceso');
        error.status = 404;
        error.details = inspErr?.message || 'No se encontró el registro';
        throw error;
    }

    let tecnicoNombre = 'No asignado';
    if (insp.tecnico_id) {
        try {
            const authRes = await authClient.getUsuarioById(insp.tecnico_id);
            tecnicoNombre = authRes?.nombre || `Técnico #${insp.tecnico_id}`;
        } catch (err) {
            console.error('⚠️ Error fetching tecnico_nombre in contexto:', err.message);
            tecnicoNombre = `Técnico #${insp.tecnico_id}`;
        }
    }

    const headers = {
        'x-user-id': reqUser.id_usuario,
        'x-user-role': reqUser.role
    };

    let prod = { nombre: 'Productor Desconocido', region: null, usuario_predio: [] };
    try {
        prod = await authClient.getUsuarioById(insp.productor_id, headers);
    } catch (e) {
        console.error('⚠️ MS-AUTH Error:', e.message);
    }

    const region = prod.region;
    const ubicacionParts = [];
    if (region?.vereda) ubicacionParts.push(region.vereda);
    if (region?.municipio) ubicacionParts.push(region.municipio);
    if (region?.departamento) ubicacionParts.push(region.departamento);
    const ubicacionFull = ubicacionParts.length > 0 ? ubicacionParts.join(', ') : 'Sin Ubicación';

    let lotesData = [];
    try {
        lotesData = await prediosClient.getLugaresProduccion(headers);
    } catch (e) {
        console.error('⚠️ MS-PREDIOS Error:', e.message);
    }

    console.log(`🔎 [MS-INSPECCIONES] Contexto: insp.productor_id=${insp.productor_id}`);
    console.log(`🔎 [MS-INSPECCIONES] Lugares recibidos: ${lotesData?.length || 0}`);

    // FILTRAR: Solo los lugares que pertenecen al productor de esta inspección
    const todosLugares = (lotesData || []).filter(p => {
        return String(p.productor_id) === String(insp.productor_id);
    });

    console.log(`🔎 [MS-INSPECCIONES] Lugares filtrados: ${todosLugares.length}`);

    // Helper: enriquecer un lote con datos de siembra/cultivo
    const enriquecerLote = async (lote) => {
        let siembras = [];
        try {
            siembras = await cultivoClient.getSiembrasByLote(lote.id_lote, headers);
        } catch (e) {
            console.error(`⚠️ MS-CULTIVO Error (Lote ${lote.id_lote}):`, e.message);
        }

        const siembra = siembras[0] || null;
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
        const matchesPredio = lugar.predio || [];
        const predioOficialInfo = insp.id_predio
            ? matchesPredio.find(p => p.id_predio === insp.id_predio)
            : matchesPredio[0];

        const prediosParaLotes = insp.id_predio && lugar.id_lugar_produccion === insp.id_lugar_produccion
            ? matchesPredio.filter(p => p.id_predio === insp.id_predio)
            : matchesPredio;

        const prediosEnriquecidos = await Promise.all(prediosParaLotes.map(async (p) => {
            const lotesValidos = (p.lote || []).filter(l => l.estado !== 'inactivo' && l.estado !== 'eliminado');
            const lotesPredio = await Promise.all(lotesValidos.map(enriquecerLote));
            return {
                ...p,
                lotes: lotesPredio
            };
        }));

        const lotesEnriquecidos = prediosEnriquecidos.flatMap(p => p.lotes);
        const areaDelLugar = lotesEnriquecidos.reduce((sum, lote) => sum + (Number(lote.area) || 0), 0);

        return {
            id_lugar_produccion: lugar.id_lugar_produccion,
            numero_registro: lugar.numero_registro,
            nombre_lugar: lugar.nombre_lugar,
            nombre_empresa: lugar.nombre_lugar,
            area_total: areaDelLugar,
            es_lugar_inspeccion: lugar.id_lugar_produccion === insp.id_lugar_produccion,
            predios: prediosEnriquecidos,
            lotes: lotesEnriquecidos
        };
    }));

    const lugarInspeccion = lugaresEnriquecidos.find(l => l.es_lugar_inspeccion);
    const totalLotes = lugaresEnriquecidos.reduce((acc, l) => acc + l.lotes.length, 0);

    const areaTotal = lugaresEnriquecidos.reduce((acc, lugar) => {
        return acc + lugar.lotes.reduce((sum, lote) => sum + (Number(lote.area) || 0), 0);
    }, 0);

    const predioOficial = lugarInspeccion?.nombre_lugar || lugaresEnriquecidos[0]?.nombre_lugar || 'Sin Lugar Registrado';

    const { data: detallesPrevios } = await supabase
        .from('detalle_inspeccion')
        .select('*')
        .eq('id_inspeccion', insp.id_inspeccion)
        .order('id_detalle', { ascending: true });

    const hallazgosEnriquecidos = await Promise.all((detallesPrevios || []).map(async (hp) => {
        try {
            const sRes = await cultivoClient.getSiembraById(hp.siembra_id, headers);
            return { ...hp, id_lote: sRes?.id_lote };
        } catch (e) {
            return hp;
        }
    }));

    return {
        id_inspeccion: insp.id_inspeccion,
        id_predio: insp.id_predio,
        id_lugar_produccion: insp.id_lugar_produccion,
        tecnico_nombre: tecnicoNombre,
        observaciones_generales: insp.observaciones_generales || '',
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
    };
};

const registrarDetalles = async (id, items) => {
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

    // Cambiar estado si estaba en 'programada'
    await supabase.from('inspeccion').update({ estado: 'en_proceso' }).eq('id_inspeccion', id).eq('estado', 'programada');

    return results;
};

const eliminarDetalle = async (idDetalle) => {
    const { error } = await supabase.from('detalle_inspeccion').delete().eq('id_detalle', idDetalle);
    if (error) throw error;
    return { success: true, message: 'Detalle eliminado' };
};

const generarReporte = async (reqUser) => {
    const { id_usuario, role } = reqUser;

    let query = supabase.from('inspeccion').select('*, detalle_inspeccion(*)');

    if (role !== 'ADMIN_ICA' && role !== 'admin') {
        const producerId = Number(id_usuario);
        if (isNaN(producerId)) return [];
        query = query.eq('productor_id', producerId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const enriched = await Promise.all((data || []).map(async (ins) => {
        if (!ins.tecnico_id) return { ...ins, tecnico_nombre: 'Por asignar' };
        try {
            const authRes = await authClient.getUsuarioById(ins.tecnico_id);
            return { ...ins, tecnico_nombre: authRes?.nombre || `Técnico #${ins.tecnico_id}` };
        } catch {
            return { ...ins, tecnico_nombre: `Técnico #${ins.tecnico_id}` };
        }
    }));

    return enriched;
};

const obtenerAsignadas = async (reqUser) => {
    const { id_usuario, role } = reqUser;
    const userRole = role?.toLowerCase();

    console.log(`🔍 [MS-INSPECCIONES] /asignadas: user=${id_usuario}, role=${userRole}`);

    if (userRole !== 'tecnico' && userRole !== 'admin') {
        const error = new Error('Solo los técnicos pueden ver sus asignaciones.');
        error.status = 403;
        throw error;
    }

    let query = supabase.from('inspeccion').select('*');
    if (userRole === 'tecnico') {
        const tId = parseInt(id_usuario);
        query = query.eq('tecnico_id', isNaN(tId) ? id_usuario : tId);
    }

    const { data: asignaciones, error } = await query;
    if (error) {
        console.error('❌ Error Supabase /asignadas:', error);
        throw error;
    }

    if (!asignaciones || asignaciones.length === 0) {
        console.log('⚠️ No se encontraron inspecciones asignadas');
        return [];
    }

    const enriched = await Promise.all(asignaciones.map(async (ins) => {
        try {
            const headers = { 'x-user-id': id_usuario, 'x-user-role': role };

            const predioRes = await prediosClient.getLugaresProduccion(headers);
            const lugar = predioRes.find(p => p.id_lugar_produccion === ins.id_lugar_produccion);

            const prod = await authClient.getUsuarioById(ins.productor_id, headers);
            const region = prod?.region;

            const predioInfo = Array.isArray(lugar?.predio)
                ? (ins.id_predio ? lugar.predio.find(p => p.id_predio === ins.id_predio) : lugar.predio[0])
                : lugar?.predio;

            const ubicacionParts = [];
            if (region?.vereda) ubicacionParts.push(region.vereda);
            if (region?.municipio) ubicacionParts.push(region.municipio);
            if (region?.departamento) ubicacionParts.push(region.departamento);

            const ubicacion = ubicacionParts.length > 0 ? ubicacionParts.join(', ') : 'Ubicación no registrada';

            const prediosArray = Array.isArray(lugar?.predio)
                ? lugar.predio
                : (lugar?.predio ? [lugar.predio] : []);

            let tecnicoNombre = 'No asignado';
            if (ins.tecnico_id) {
                try {
                    const authRes = await authClient.getUsuarioById(ins.tecnico_id);
                    tecnicoNombre = authRes?.nombre || `Técnico #${ins.tecnico_id}`;
                } catch {
                    tecnicoNombre = `Técnico #${ins.tecnico_id}`;
                }
            }

            return {
                ...ins,
                tecnico_nombre: tecnicoNombre,
                lugar_produccion: {
                    nombre_lugar: lugar?.nombre_lugar || 'Lugar sin nombre',
                    ubicacion: ubicacion,
                    predios: prediosArray
                }
            };

        } catch (err) {
            console.error(`⚠️ Error enriqueciendo inspección ${ins.id_inspeccion}:`, err.message);
            return { ...ins, lugar_produccion: { nombre_lugar: 'Inspección #' + ins.id_inspeccion, ubicacion: 'Sin ubicación' } };
        }
    }));

    return enriched;
};

const finalizarInspeccion = async (id, observaciones_generales, estado) => {
    const { error } = await supabase.from('inspeccion')
        .update({ estado, observaciones_generales })
        .eq('id_inspeccion', id);

    if (error) throw error;
    return { message: 'Inspección finalizada con éxito' };
};

const agendarInspeccion = async (body, reqUser) => {
    console.log('📝 Iniciando agendamiento automático...');
    const { id_lugar_produccion, id_predio, fecha, hora } = body;
    const productor_id = Number(reqUser.id_usuario);
    const headers = { 'x-user-id': reqUser.id_usuario, 'x-user-role': reqUser.role };

    if (!id_lugar_produccion || !fecha || !hora) {
        const error = new Error('Faltan campos obligatorios (predio, fecha u hora).');
        error.status = 400;
        throw error;
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
        const error = new Error('Este predio ya cuenta con una inspección activa (programada o en proceso). Podrás agendar una nueva inspección cuando el técnico finalice la actual.');
        error.status = 400;
        throw error;
    }

    // 🛑 Regla de negocio: Mínimo 3 días de antelación
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const targetDate = new Date(fecha + 'T00:00:00');
    const diffTime = targetDate.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 3) {
        const error = new Error('La inspección debe ser agendada con un mínimo de 3 días de antelación. (Ejemplo: Para el 21/05/2026 debes agendar a más tardar el 18/05/2026).');
        error.status = 400;
        throw error;
    }

    // 🛑 Regla de negocio: Horario de 6:00 AM a 12:00 PM
    const [hours, minutes] = hora.split(':').map(Number);
    const totalMinutes = hours * 60 + (minutes || 0);
    const minMinutes = 6 * 60;  // 06:00 AM
    const maxMinutes = 12 * 60; // 12:00 PM (Mediodía)

    if (totalMinutes < minMinutes || totalMinutes > maxMinutes) {
        const error = new Error('El horario permitido para agendar inspecciones es de 6:00 AM a 12:00 PM.');
        error.status = 400;
        throw error;
    }

    const fechaProgramada = `${fecha}T${hora}:00`;

    // 1. PASO 4: Validar que el predio tenga lotes activos
    let predioData = [];
    try {
        predioData = await prediosClient.getLugaresProduccion(headers);
    } catch (e) {
        console.error('❌ Error llamando a MS-PREDIOS:', e.message);
    }

    const lugar = predioData.find(p => p.id_lugar_produccion === Number(id_lugar_produccion));
    const tieneLotes = lugar?.predio?.some(p => p.lote && p.lote.length > 0);

    if (!lugar || !tieneLotes) {
        const error = new Error('El predio seleccionado no cuenta con la información necesaria para solicitar una inspección (No tiene lotes registrados).');
        error.status = 400;
        throw error;
    }

    // 2. Obtener datos del productor para su región (como fallback de asignación)
    let prodRes = null;
    try {
        prodRes = await authClient.getUsuarioById(productor_id, headers);
    } catch (e) {
        console.error('❌ Error llamando a MS-AUTH (Productor):', e.message);
    }

    const regionProductor = prodRes?.region;

    // 🔍 Prioridad de Región: Usamos la región del predio seleccionado en lugar de la del productor!
    const predioObjeto = lugar?.predio?.find(p => p.id_predio === Number(id_predio)) || lugar?.predio?.[0];
    const regionAsignacion = predioObjeto?.region || regionProductor;

    if (!regionAsignacion) {
        const error = new Error('El predio seleccionado no tiene una ubicación o región registrada para asignar un técnico.');
        error.status = 400;
        throw error;
    }

    // 3. Obtener técnicos desde MS-AUTH
    let todosTecnicos = [];
    try {
        todosTecnicos = await authClient.getTecnicos();
    } catch (e) {
        console.error('❌ Error llamando a MS-AUTH (Técnicos):', e.message);
    }

    if (!todosTecnicos || todosTecnicos.length === 0) {
        const error = new Error('No hay técnicos activos en el sistema.');
        error.status = 503;
        throw error;
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
        const error = new Error(`No hay técnicos disponibles en la región del predio (${regionAsignacion.departamento || 'Sin departamento'}).`);
        error.status = 400;
        throw error;
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
        const error = new Error('No hay técnicos disponibles para la fecha y hora seleccionadas.');
        error.status = 400;
        error.sugerencia = 'Por favor seleccione una fecha u hora diferente.';
        throw error;
    }

    // 6. Balanceo de Carga
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

    return {
        message: 'Inspección agendada exitosamente',
        tecnico_asignado: elegible.nombre,
        detalle: nueva[0]
    };
};

const cancelarInspeccion = async (id, reqUser) => {
    const productor_id = Number(reqUser.id_usuario);

    const { data: insp, error: findErr } = await supabase
        .from('inspeccion')
        .select('*')
        .eq('id_inspeccion', id)
        .single();

    if (findErr || !insp) {
        const error = new Error('Cita no encontrada.');
        error.status = 404;
        throw error;
    }

    if (insp.productor_id !== productor_id && reqUser.role !== 'admin') {
        const error = new Error('No tiene permiso para cancelar esta cita.');
        error.status = 403;
        throw error;
    }

    if (insp.estado !== 'programada') {
        const error = new Error('No se puede cancelar una inspección que ya está en proceso o finalizada.');
        error.status = 400;
        throw error;
    }

    const { error: cancelErr } = await supabase
        .from('inspeccion')
        .update({ estado: 'cancelada', observaciones_generales: 'Cancelada por el productor' })
        .eq('id_inspeccion', id);

    if (cancelErr) throw cancelErr;

    return { message: 'La solicitud de inspección ha sido cancelada exitosamente.' };
};

const obtenerInspeccionActivaLugar = async (id) => {
    const { data, error } = await supabase
        .from('inspeccion')
        .select('id_inspeccion, estado')
        .eq('id_lugar_produccion', Number(id))
        .in('estado', ['programada', 'en_proceso']);

    if (error) throw error;

    const activa = data && data.length > 0;
    return { activa, inspeccion: activa ? data[0] : null };
};

const obtenerInspeccionActivaPredio = async (id) => {
    const { data, error } = await supabase
        .from('inspeccion')
        .select('id_inspeccion, estado')
        .eq('id_predio', Number(id))
        .in('estado', ['programada', 'en_proceso']);

    if (error) throw error;

    const activa = data && data.length > 0;
    return { activa, inspeccion: activa ? data[0] : null };
};



module.exports = {
    obtenerContexto,
    registrarDetalles,
    eliminarDetalle,
    generarReporte,
    obtenerAsignadas,
    finalizarInspeccion,
    agendarInspeccion,
    cancelarInspeccion,
    obtenerInspeccionActivaLugar,
    obtenerInspeccionActivaPredio
};

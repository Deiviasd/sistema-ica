const { createSiembra, getSiembras, finishSiembra } = require('../repositories/siembra.repository')
const eventBus = require('./eventBus')

const registerSiembraService = async (siembraData, userId) => {
    const siembra = await createSiembra({
        ...siembraData
    })

    // 📣 Notificar a Auditoría
    eventBus.publish('audit_queue', {
        modulo: 'cultivos',
        tipo_accion: 'NUEVA_SIEMBRA',
        id_referencia: siembra.id_siembra,
        id_usuario: userId,
        timestamp: new Date().toISOString()
    })

    return siembra
}

const listSiembrasService = async (userId, role, id_lote = null) => {
    let authorizedLoteIds = null;

    // 🛡️ ORQUESTACIÓN: Si es productor, pedimos sus lotes a MS-PREDIOS para filtrar localmente
    if (role?.toLowerCase() === 'productor' && userId) {
        try {
            const prediosUrl = process.env.PREDIOS_SERVICE_URL || 'http://ms-predios:4001';
            const res = await fetch(`${prediosUrl}/lugares-produccion`, {
                headers: { 'x-user-id': userId, 'x-user-role': role }
            });
            
            if (res.ok) {
                const predios = await res.json();
                authorizedLoteIds = predios.flatMap(p => p.lote?.map(l => l.id_lote) || []);
                
                // Si el productor no tiene lotes, no tiene siembras propias que ver
                if (authorizedLoteIds.length === 0) return [];
            }
        } catch (error) {
            console.error('⚠️ MS-CULTIVO: Error de conexión con MS-PREDIOS:', error.message);
            return []; // Por seguridad, si no podemos validar, no mostramos nada
        }
    }

    return await getSiembras(userId, role, id_lote, authorizedLoteIds)
}

const finishSiembraService = async (id, userId, fechaFin = new Date().toISOString().split('T')[0]) => {
    const siembra = await finishSiembra(id, fechaFin)

    // 📣 Notificar a Auditoría que el ciclo terminó
    eventBus.publish('audit_queue', {
        modulo: 'cultivos',
        tipo_accion: 'SIEMBRA_FINALIZADA',
        id_referencia: siembra.id_siembra,
        id_usuario: userId,
        detalles: `Ciclo finalizado el ${fechaFin}`,
        timestamp: new Date().toISOString()
    })

    // 🚜 EVENTO DE NEGOCIO: Programar Inspección Automática y desactivar lote!
    eventBus.publish('inspecciones_queue', {
        tipo: 'SIEMBRA_FINALIZADA',
        id_siembra: siembra.id_siembra,
        id_lote: siembra.id_lote,
        productor_id: userId,
        fecha: fechaFin
    });

    return siembra
}

module.exports = { registerSiembraService, listSiembrasService, finishSiembraService }

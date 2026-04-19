const { createSiembra, getSiembras, finishSiembra } = require('../repositories/siembra.repository')
const eventBus = require('./eventBus')

const registerSiembraService = async (siembraData, userId) => {
    const siembra = await createSiembra({
        ...siembraData,
        productor_id: userId
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

const listSiembrasService = async (userId, role) => {
    return await getSiembras(userId, role)
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

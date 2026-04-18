const { createSiembra, getSiembras } = require('../repositories/siembra.repository')
const eventBus = require('./eventBus')

const registerSiembraService = async (siembraData, userId) => {
    const siembra = await createSiembra(siembraData)

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

const listSiembrasService = async () => {
    return await getSiembras()
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

    return siembra
}

module.exports = { registerSiembraService, listSiembrasService, finishSiembraService }

const { registerSiembraService, listSiembrasService, getSiembraByIdService, finishSiembraService } = require('../services/siembra.service')

const createSiembraController = async (req, res) => {
    try {
        const userId = req.user.id
        const result = await registerSiembraService(req.body, userId)
        res.status(201).json(result)
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const getSiembrasController = async (req, res) => {
    try {
        const userId = req.user.id
        const role = req.user.role
        const { id_lote, historial } = req.query
        const result = await listSiembrasService(userId, role, id_lote, historial === 'true')
        res.status(200).json(result)
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const getSiembraByIdController = async (req, res) => {
    try {
        const { id } = req.params
        const result = await getSiembraByIdService(id)
        res.status(200).json(result)
    } catch (error) {
        res.status(404).json({ error: error.message })
    }
}

const finishSiembraController = async (req, res) => {
    try {
        const { id } = req.params
        const userId = req.user.id
        const { fecha_fin } = req.body
        const result = await finishSiembraService(id, userId, fecha_fin)
        res.status(200).json(result)
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

module.exports = { createSiembraController, getSiembrasController, getSiembraByIdController, finishSiembraController }

const { registerSiembraService, listSiembrasService, finishSiembraService } = require('../services/siembra.service')

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
        const result = await listSiembrasService()
        res.status(200).json(result)
    } catch (error) {
        res.status(400).json({ error: error.message })
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

module.exports = { createSiembraController, getSiembrasController, finishSiembraController }

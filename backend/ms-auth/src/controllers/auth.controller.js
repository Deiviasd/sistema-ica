const { loginService, registerService, getPendingUsersService, updateUserService, getUserService } = require('../services/auth.service')

const registerController = async (req, res) => {
    try {
        const result = await registerService(req.body)
        res.status(201).json(result)
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}
const loginController = async (req, res) => {
    try {
        const result = await loginService(req.body)
        res.status(200).json(result)
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const getPendingController = async (req, res) => {
    try {
        const result = await getPendingUsersService()
        res.status(200).json(result)
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const updateStatusController = async (req, res) => {
    try {
        const { id } = req.params
        const adminId = req.user.id // ID del Admin ICA (extraído del token)
        const result = await updateUserService(adminId, id, req.body)
        res.status(200).json(result)
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const getUserController = async (req, res) => {
    try {
        const { id } = req.params
        const result = await getUserService(id)
        res.status(200).json(result)
    } catch (error) {
        res.status(404).json({ error: error.message })
    }
}

module.exports = { loginController, registerController, getPendingController, updateStatusController, getUserController }
const { loginService, registerService } = require('../services/auth.service')

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


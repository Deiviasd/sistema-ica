const { loginService, registerService, getUsersByStatusService, getAllUsersService, updateUserService, deleteUserService, getUserService, getUsersByRoleService } = require('../services/auth.service')

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

const getUsersByStatusController = async (req, res) => {
    try {
        const { status } = req.query
        const result = await getUsersByStatusService(status || 'inactivo')
        res.status(200).json(result)
    } catch (error) {
        console.error('❌ Error en getUsersByStatusController:', error)
        res.status(400).json({ error: error.message })
    }
}

const getAllController = async (req, res) => {
    try {
        const result = await getAllUsersService()
        res.status(200).json(result)
    } catch (error) {
        console.error('❌ Error en getAllController:', error)
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

const deleteController = async (req, res) => {
    try {
        const { id } = req.params
        const adminId = req.user.id
        const result = await deleteUserService(adminId, id)
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

const getProfileController = async (req, res) => {
    try {
        // Obtenemos el ID del token verificado por el middleware
        const userId = req.user.id || req.user.sub;
        const user = await getUserService(userId);

        if (!user) throw new Error('Usuario no encontrado');

        const roleMap = {
            'ADMIN_ICA': 'admin',
            'TECNICO': 'tecnico',
            'PRODUCTOR': 'productor'
        };

        const response = {
            user: {
                id: user.id_usuario,
                id_usuario: user.id_usuario,
                email: user.correo,
                nombre: user.nombre,
                id_region: user.id_region, // Referencia geográfica
                documento: user.documento, // ✨ Añadir soporte de documento
                identificacion: user.documento, // ✨ Soporte para compatibilidad frontend
                numero_documento: user.documento, // ✨ Soporte para compatibilidad frontend
                role: roleMap[user.id_rol] || 'guest',
                app_metadata: {
                    role: roleMap[user.id_rol] || 'guest'
                }
            }
        };

        res.status(200).json(response);
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
}

const getUsersByRoleController = async (req, res) => {
    try {
        const { role } = req.params
        const result = await getUsersByRoleService(role)
        res.status(200).json(result)
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const checkEmailController = async (req, res) => {
    try {
        const { email } = req.params
        const exists = await checkEmailService(email)
        res.status(200).json({ exists })
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

module.exports = { loginController, registerController, getUsersByStatusController, getAllController, updateStatusController, deleteController, getUserController, getUsersByRoleController, getProfileController, checkEmailController }
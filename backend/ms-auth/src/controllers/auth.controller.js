const { loginService, registerService, getPendingUsersService, updateUserService, getUserService, getUsersByRoleService } = require('../services/auth.service')

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

const getProfileController = async (req, res) => {
    try {
        // Obtenemos el ID del token verificado por el middleware
        const userId = req.user.id || req.user.sub;
        const user = await getUserService(userId);

        if (!user) throw new Error('Usuario no encontrado');

        // Aplanamos la información del predio para el frontend
        const predio = user.usuario_predio && user.usuario_predio.length > 0 
            ? user.usuario_predio[0] 
            : null;

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
                role: roleMap[user.id_rol] || 'guest',
                nombre_predio: predio?.nombre_predio || '',
                numero_predial: predio?.numero_predial || '',
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

module.exports = { loginController, registerController, getPendingController, updateStatusController, getUserController, getUsersByRoleController, getProfileController }
const bcrypt = require('bcrypt')
const { createUser, findUserByEmail, getPendingUsers, updateStatus, findUserById } = require('../repositories/user.repository')
const jwt = require('jsonwebtoken')
const eventBus = require('./eventBus')

const registerService = async (userData) => {
    const { email, password } = userData;

    if (!email || !password) {
        throw new Error('Email y password requeridos')
    }

    const existingUser = await findUserByEmail(email)

    if (existingUser) {
        throw new Error('Usuario ya existe')
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await createUser({
        nombre: userData.nombre,
        documento: userData.documento,
        email,
        password: hashedPassword,
        id_rol: userData.id_rol,
        id_region: userData.id_region,
        estado: 'inactivo' // ⏳ Pendiente de aprobación por Admin ICA
    })

    return {
        id: user.id_usuario,
        email: user.correo
    }
}

const loginService = async ({ email, password }) => {

    if (!email || !password) {
        throw new Error('Email y password requeridos')
    }

    const user = await findUserByEmail(email)

    if (!user) {
        throw new Error('Usuario no encontrado')
    }

    const isValidPassword = await bcrypt.compare(password, user.contraseña || '')

    if (!isValidPassword) {
        throw new Error('Credenciales inválidas')
    }

    if (user.estado !== 'activo') {
        throw new Error(`Cuenta ${user.estado}. Espere aprobación administrativa.`)
    }

    // Role mapping for JWT requirement
    const roleMap = {
        'ADMIN_ICA': 'admin',
        'TECNICO': 'tecnico',
        'PRODUCTOR': 'productor'
    }
    const userRole = roleMap[user.id_rol] || 'guest'

    const token = jwt.sign(
        { 
            sub: user.id_auth_supabase || user.id_usuario,
            id: user.id_usuario, // Gateway compat: "req.user.id"
            email: user.correo,
            app_metadata: {
                role: userRole
            },
            id_usuario: user.id_usuario
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    )

    return { token, user: { email: user.correo, role: userRole } }
}

const getPendingUsersService = async () => {
    return await getPendingUsers()
}

const updateUserService = async (adminId, userId, { estado }) => {
    const user = await updateStatus(userId, estado)

    // 📣 Notificar a Auditoría
    eventBus.publish('audit_queue', {
        modulo: 'seguridad',
        tipo_accion: `USER_${estado.toUpperCase()}`,
        id_referencia: user.id_usuario,
        id_usuario: adminId,
        detalles: `Admin ICA cambió estado de usuario ${user.correo} a ${estado}`,
        timestamp: new Date().toISOString()
    })

    return user
}

const getUserService = async (id) => {
    const user = await findUserById(id)
    if (!user) throw new Error(`Usuario ${id} no encontrado`)
    return user
}

module.exports = { loginService, registerService, getPendingUsersService, updateUserService, getUserService }
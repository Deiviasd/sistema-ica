const bcrypt = require('bcrypt')
const { createUser, findUserByEmail, getUsersByStatus, getAllUsers, updateStatus, findUserById, findUsersByRole, deleteUser } = require('../repositories/user.repository')
const { createRegion } = require('../repositories/catalogo.repository')
const jwt = require('jsonwebtoken')
const eventBus = require('./eventBus')
const { supabase } = require('../config/supabase') // ✨ Centralizado al inicio

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

    // ✨ ms-auth ahora es puro: solo guarda el id_region referencial
    const user = await createUser({
        nombre: userData.nombre,
        documento: userData.documento,
        email,
        password: hashedPassword,
        id_rol: userData.id_rol,
        id_region: userData.id_region, // Solo guardamos la referencia
        id_auth_supabase: userData.id_auth_supabase,
        estado: 'inactivo' // 🔒 Seguridad: Requiere aprobación administrativa
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

    if (user.estado?.toLowerCase() !== 'activo') {
        throw new Error(`Cuenta ${user.estado}. Espere aprobación administrativa.`)
    }

    // Role mapping for JWT requirement
    const roleMap = {
        'ADMIN_ICA': 'admin',
        'TECNICO': 'tecnico',
        'PRODUCTOR': 'productor'
    }
    const userRole = roleMap[user.id_rol] || 'guest'

    // ✨ Extraemos la información del predio asociado (si existe)
    const predio = user.usuario_predio && user.usuario_predio.length > 0 
        ? user.usuario_predio[0] 
        : null;

    const token = jwt.sign(
        {
            sub: user.id_auth_supabase || user.id_usuario,
            id: user.id_usuario, // Gateway compat: "req.user.id"
            email: user.correo,
            nombre: user.nombre,
            nombre_predio: predio?.nombre_predio || '', // ✨ Nombre de la finca
            numero_predial: predio?.numero_predial || '', // ✨ Número predial oficial
            app_metadata: {
                role: userRole
            },
            id_usuario: user.id_usuario
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    )

    return { 

        token, 
        user: { 
            email: user.correo, 
            role: userRole, 
            nombre: user.nombre,
            documento: user.documento, // ✨ Soporte de documento
            identificacion: user.documento, // ✨ Soporte para compatibilidad frontend
            numero_documento: user.documento, // ✨ Soporte para compatibilidad frontend
            nombre_predio: predio?.nombre_predio || '',
            numero_predial: predio?.numero_predial || ''
        } 
    }
}

const getUsersByStatusService = async (status) => {
    return await getUsersByStatus(status)
}

const getAllUsersService = async () => {
    return await getAllUsers()
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

const deleteUserService = async (adminId, userId) => {
    const user = await deleteUser(userId)

    // 📣 Notificar a Auditoría
    eventBus.publish('audit_queue', {
        modulo: 'seguridad',
        tipo_accion: 'USER_DELETE',
        id_referencia: userId,
        id_usuario: adminId,
        detalles: `Admin ICA eliminó permanentemente al usuario ${user?.correo || userId}`,
        timestamp: new Date().toISOString()
    })

    return user
}

const getUserService = async (id) => {
    const user = await findUserById(id)
    if (!user) throw new Error(`Usuario ${id} no encontrado`)
    return user
}

const getUsersByRoleService = async (role) => {
    return await findUsersByRole(role)
}

const checkEmailService = async (email) => {
    const user = await findUserByEmail(email)
    return !!user
}

module.exports = { loginService, registerService, getUsersByStatusService, getAllUsersService, updateUserService, deleteUserService, getUserService, getUsersByRoleService, checkEmailService }
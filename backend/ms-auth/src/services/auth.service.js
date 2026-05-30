const bcrypt = require('bcrypt')
const { createUser, findUserByEmail, getUsersByStatus, getAllUsers, updateStatus, updateUser, findUserById, findUsersByRole, deleteUser } = require('../repositories/user.repository')
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

    const loginResult = {
        token,
        user: {
            id: user.id_usuario,
            email: user.correo,
            role: userRole,
            nombre: user.nombre,
            documento: user.documento,
            identificacion: user.documento,
            numero_documento: user.documento,
            nombre_predio: predio?.nombre_predio || '',
            numero_predial: predio?.numero_predial || ''
        }
    }

    // 📣 Notificar a Auditoría (Login exitoso)
    eventBus.publish('audit_queue', {
        modulo: 'seguridad',
        tipo_accion: 'LOGIN',
        id_usuario: user.id_usuario,
        nombre_usuario: user.nombre,
        correo: user.correo,
        rol: userRole,
        descripcion: `Inicio de sesión exitoso`,
        timestamp: new Date().toISOString()
    })

    return loginResult
}

const getUsersByStatusService = async (status) => {
    return await getUsersByStatus(status)
}

const getAllUsersService = async () => {
    return await getAllUsers()
}

const updateUserService = async (adminId, userId, updateData) => {
    // 📸 Manejo de Foto de Perfil en Supabase Storage

    // Caso 1: Subir/Reemplazar foto (Base64 → Storage)
    if (updateData.foto_perfil && updateData.foto_perfil.startsWith('data:image')) {
        try {
            console.log(`🚀 Procesando subida de foto para usuario ${userId} a Supabase Storage...`)

            // 1. Extraer los datos puros del Base64
            const base64Data = updateData.foto_perfil.split(';base64,').pop()
            const buffer = Buffer.from(base64Data, 'base64')
            const contentType = updateData.foto_perfil.split(';')[0].split(':')[1] || 'image/webp'

            // 2. Ruta estandarizada: carpeta-usuario/perfil.webp
            const filePath = `${userId}/perfil.webp`

            // 3. Subir usando SERVICE_ROLE_KEY (permisos totales)
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, buffer, {
                    contentType,
                    upsert: true
                })

            if (uploadError) throw uploadError

            // 4. Obtener URL pública y reemplazar el Base64 por la URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            // Agregamos timestamp para evitar caché agresivo
            updateData.foto_perfil = `${publicUrl}?t=${Date.now()}`
            console.log(`✅ Foto subida exitosamente: ${updateData.foto_perfil}`)

        } catch (storageError) {
            console.error('❌ Error crítico subiendo a Supabase Storage:', storageError.message)
        }
    }

    // Caso 2: Eliminar foto (null → borrar del Storage y limpiar DB)
    if (updateData.foto_perfil === null) {
        try {
            console.log(`🗑️ Eliminando foto de perfil del usuario ${userId}...`)
            const filePath = `${userId}/perfil.webp`
            await supabase.storage.from('avatars').remove([filePath])
            console.log(`✅ Foto eliminada del Storage`)
        } catch (storageError) {
            console.error('❌ Error eliminando foto de Supabase Storage:', storageError.message)
        }
    }

    const user = await updateUser(userId, updateData)

    // 📣 Notificar a Auditoría
    const action = updateData.estado ? `USER_${updateData.estado.toUpperCase()}` : 'USER_UPDATE'
    const detail = updateData.estado ? `Cambio estado a ${updateData.estado}` : 'Actualización de perfil'

    // Intentamos obtener info del que realiza la acción (admin o el propio usuario)
    let performer = { nombre: 'Sistema', email: 'sistema@ica.gov.co', rol: 'SISTEMA' };
    try {
        const p = await findUserById(adminId || userId);
        if (p) {
            performer = {
                nombre: p.nombre,
                email: p.correo,
                rol: roleMap[p.id_rol] || 'authenticated'
            };
        }
    } catch (e) { }

    eventBus.publish('audit_queue', {
        modulo: 'seguridad',
        tipo_accion: action,
        id_referencia: user.id_usuario,
        id_usuario: adminId || userId,
        nombre_usuario: performer.nombre,
        correo: performer.email,
        rol: performer.rol,
        descripcion: `${detail} para usuario ${user.correo}`,
        timestamp: new Date().toISOString()
    })

    return user
}

const updateUserRoleService = async (adminId, userId, rol) => {
    const roleMap = {
        admin: 'ADMIN_ICA',
        tecnico: 'TECNICO',
        productor: 'PRODUCTOR'
    }

    const normalizedRole = String(rol || '').toLowerCase()
    const idRol = roleMap[normalizedRole]
    if (!idRol) throw new Error('Rol inválido')

    return await updateUserService(adminId, userId, { id_rol: idRol })
}

const deleteUserService = async (adminId, userId) => {
    const user = await deleteUser(userId)

    // 📣 Notificar a Auditoría
    let performer = { nombre: 'Sistema', email: 'sistema@ica.gov.co', rol: 'SISTEMA' };
    try {
        const p = await findUserById(adminId);
        if (p) {
            const roleMap = { 'ADMIN_ICA': 'admin', 'TECNICO': 'tecnico', 'PRODUCTOR': 'productor' };
            performer = {
                nombre: p.nombre,
                email: p.correo,
                rol: roleMap[p.id_rol] || 'admin'
            };
        }
    } catch (e) { }

    eventBus.publish('audit_queue', {
        modulo: 'seguridad',
        tipo_accion: 'USER_DELETE',
        id_referencia: userId,
        id_usuario: adminId,
        nombre_usuario: performer.nombre,
        correo: performer.email,
        rol: performer.rol,
        descripcion: `Admin eliminó al usuario ${user?.correo || userId}`,
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

module.exports = { loginService, registerService, getUsersByStatusService, getAllUsersService, updateUserService, updateUserRoleService, deleteUserService, getUserService, getUsersByRoleService, checkEmailService }

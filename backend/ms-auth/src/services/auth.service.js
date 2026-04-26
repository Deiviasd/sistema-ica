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

    // 📍 1. Si trae datos de ubicación física, creamos la región
    let finalRegionId = userData.id_region;
    if (userData.departamento && userData.municipio) {
        const newRegion = await createRegion({
            id_region: `LOC-${Date.now()}`, // ID único para la ubicación
            departamento: userData.departamento,
            municipio: userData.municipio,
            vereda: userData.vereda,
            direccion: userData.direccion
        });
        finalRegionId = newRegion.id_region;
    }

    const user = await createUser({
        nombre: userData.nombre,
        documento: userData.documento,
        email,
        password: hashedPassword,
        id_rol: userData.id_rol,
        id_region: finalRegionId,
        id_auth_supabase: userData.id_auth_supabase,
        estado: 'inactivo'
    })

    // 🏘️ 2. Si es productor y trae número predial, lo asociamos con su NOMBRE DE PREDIO
    console.log(`🔎 [AUTH DEBUG] Evaluando asociación: Rol=${userData.id_rol}, Predial=${userData.numero_predial}`);
    
    if (userData.id_rol === 'PRODUCTOR' && userData.numero_predial) {
        try {
            console.log(`✍️ [AUTH DEBUG] Intentando insertar en usuario_predio para ID: ${user.id_usuario}`);
            const { data: predioData, error: predioError } = await supabase.from('usuario_predio').insert([{
                id_usuario: user.id_usuario,
                numero_predial: parseInt(userData.numero_predial),
                nombre_predio: userData.nombre_predio
            }]).select();

            if (predioError) {
                console.error('❌ [AUTH DEBUG] Error de Supabase al insertar predio:', predioError.message);
            } else {
                console.log('✅ [AUTH DEBUG] Asociación exitosa:', predioData);
            }
        } catch (err) {
            console.error('⚠️ [AUTH DEBUG] Error crítico en catch de asociación:', err.message);
        }
    } else {
        console.warn('⚠️ [AUTH DEBUG] No se cumplieron condiciones para asociar predio.');
    }

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

module.exports = { loginService, registerService, getUsersByStatusService, getAllUsersService, updateUserService, deleteUserService, getUserService, getUsersByRoleService }
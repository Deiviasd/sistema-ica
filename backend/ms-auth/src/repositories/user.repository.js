const { supabase } = require('../config/supabase')

const createUser = async (userData) => {

    const { data, error } = await supabase
        .from('usuario')
        .insert([{
            nombre: userData.nombre,
            documento: userData.documento,
            correo: userData.email,
            contraseña: userData.password,
            id_rol: userData.id_rol || 'PRODUCTOR',
            id_region: userData.id_region,
            estado: userData.estado || 'inactivo'
        }])
        .select()
        .single()

    if (error) throw new Error(error.message)

    return data
}

const findUserByEmail = async (email) => {
    const { data, error } = await supabase
        .from('usuario')
        .select('*, rol(*)') // Include role info
        .eq('correo', email)
        .single()

    if (error && error.code !== 'PGRST116') {
        throw new Error(error.message)
    }

    return data
}

const getPendingUsers = async () => {
    const { data, error } = await supabase
        .from('usuario')
        .select('id_usuario, nombre, correo, fecha_registro, id_rol, id_region')
        .eq('estado', 'inactivo')

    if (error) throw new Error(error.message)
    return data
}

const updateStatus = async (id, status) => {
    const { data, error } = await supabase
        .from('usuario')
        .update({ estado: status })
        .eq('id_usuario', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data
}

const findUserById = async (id) => {
    let query = supabase.from('usuario').select('*');

    // Detectar si el ID es un UUID (Supabase Auth) o un Entero (Nuestros IDs internos)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUuid) {
        query = query.eq('id_auth_supabase', id);
    } else {
        query = query.eq('id_usuario', id);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data;
}

module.exports = { createUser, findUserByEmail, getPendingUsers, updateStatus, findUserById }
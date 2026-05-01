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
            id_auth_supabase: userData.id_auth_supabase,
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
        .select('*, rol(*), region(*), usuario_predio(*)') // Incluimos info de la finca y región
        .eq('correo', email)
        .single()

    if (error && error.code !== 'PGRST116') {
        throw new Error(error.message)
    }

    return data
}

const getUsersByStatus = async (status = 'inactivo') => {
    const { data, error } = await supabase
        .from('usuario')
        .select('*, region(*), usuario_predio(*)')
        .eq('estado', status)

    if (error) throw new Error(error.message)
    return data
}

const getAllUsers = async () => {
    const { data, error } = await supabase
        .from('usuario')
        .select('*, region(*), usuario_predio(*)')
        .order('id_usuario', { ascending: false })

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

    const { data, error } = await query
        .select('*, rol(*), region(*), usuario_predio(*)')
        .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data;
}

const findUsersByRole = async (role) => {
    const { data, error } = await supabase
        .from('usuario')
        .select('id_usuario, nombre, correo, region(*)')
        .eq('id_rol', role.toUpperCase())
        .eq('estado', 'activo');

    if (error) throw new Error(error.message);
    return data;
}

const deleteUser = async (id) => {
    const { data, error } = await supabase
        .from('usuario')
        .delete()
        .eq('id_usuario', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data
}

module.exports = { createUser, findUserByEmail, getUsersByStatus, getAllUsers, updateStatus, findUserById, findUsersByRole, deleteUser }
const { supabase } = require('../config/supabase')
const axios = require('axios')

// Configuración de comunicación interna
const PREDIOS_URL = process.env.PREDIOS_SERVICE_URL || 'http://ms-predios:4001'
const INTERNAL_HEADERS = {
    headers: { 'x-internal-key': process.env.INTERNAL_API_KEY }
}

const fetchRegionFromApi = async (idRegion) => {
    try {
        const res = await axios.get(`${PREDIOS_URL}/regiones/${idRegion}`, INTERNAL_HEADERS)
        return res.data
    } catch (err) {
        console.error(`⚠️ Error consultando región ${idRegion} en MS-PREDIOS:`, err.message)
        return null
    }
}

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
        .select('*, rol(*)') // ✨ Limpio, sin tablas inexistentes
        .eq('correo', email)
        .single()

    if (error && error.code !== 'PGRST116') throw new Error(error.message)

    if (data && data.id_region) {
        data.region = await fetchRegionFromApi(data.id_region)
    }

    return data
}

const getUsersByStatus = async (status = 'inactivo') => {
    const { data, error } = await supabase
        .from('usuario')
        .select('*, rol(*)')
        .eq('estado', status)

    if (error) throw new Error(error.message)
    return data
}

const getAllUsers = async () => {
    const { data, error } = await supabase
        .from('usuario')
        .select('*, rol(*)')
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

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUuid) {
        query = query.eq('id_auth_supabase', id);
    } else {
        query = query.eq('id_usuario', id);
    }

    const { data, error } = await query
        .select('*, rol(*)') // ✨ Solo lo que existe en esta DB
        .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);

    if (data && data.id_region) {
        data.region = await fetchRegionFromApi(data.id_region)
    }

    return data;
}

const findUsersByRole = async (role) => {
    const { data, error } = await supabase
        .from('usuario')
        .select('id_usuario, nombre, correo, id_region')
        .eq('id_rol', role.toUpperCase())
        .eq('estado', 'activo');

    if (error) throw new Error(error.message);
    
    if (data && data.length > 0) {
        return await Promise.all(data.map(async (u) => {
            if (u.id_region) {
                u.region = await fetchRegionFromApi(u.id_region);
            }
            return u;
        }));
    }

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
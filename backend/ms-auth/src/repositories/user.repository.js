const { supabase } = require('../config/supabase')

const createUser = async (userData) => {
    const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single()

    if (error) throw new Error(error.message)

    return data
}

const findUserByEmail = async (email) => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

    if (error && error.code !== 'PGRST116') {
        throw new Error(error.message)
    }

    return data
}

module.exports = { createUser, findUserByEmail }
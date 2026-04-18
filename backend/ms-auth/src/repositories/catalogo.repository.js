const { supabase } = require('../config/supabase')

const getRoles = async () => {
    const { data, error } = await supabase.from('rol').select('*')
    if (error) throw new Error(error.message)
    return data
}

const getRegiones = async () => {
    const { data, error } = await supabase.from('region').select('*')
    if (error) throw new Error(error.message)
    return data
}

module.exports = { getRoles, getRegiones }

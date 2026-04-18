const { supabase } = require('../config/supabase')

const createSiembra = async (siembraData) => {
    const { data, error } = await supabase
        .from('siembra')
        .insert([siembraData])
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data
}

const getSiembras = async () => {
    const { data, error } = await supabase
        .from('siembra')
        .select('*, variedad(nombre_variedad, especie(nombre_comun))')
    
    if (error) throw new Error(error.message)
    return data
}

const finishSiembra = async (id, fechaFin) => {
    const { data, error } = await supabase
        .from('siembra')
        .update({ fecha_fin: fechaFin })
        .eq('id_siembra', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data
}

module.exports = { createSiembra, getSiembras, finishSiembra }

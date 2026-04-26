const { supabase } = require('../config/supabase')

const listEspecies = async () => {
    const { data, error } = await supabase
        .from('especie')
        .select('*')
        .order('nombre_comun', { ascending: true })

    if (error) throw new Error(error.message)
    return data
}

const listVariedadesByEspecie = async (idEspecie) => {
    const { data, error } = await supabase
        .from('variedad')
        .select('*')
        .eq('id_especie', idEspecie)
        .order('nombre_variedad', { ascending: true })

    if (error) throw new Error(error.message)
    return data
}

const createEspecie = async (nombreComun, ciclo) => {
    const { data, error } = await supabase
        .from('especie')
        .insert([{ nombre_comun: nombreComun, ciclo }])
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data
}

const createVariedad = async (idEspecie, nombreVariedad) => {
    const { data, error } = await supabase
        .from('variedad')
        .insert([{ id_especie: idEspecie, nombre_variedad: nombreVariedad }])
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data
}

module.exports = { 
    listEspecies, 
    listVariedadesByEspecie,
    createEspecie,
    createVariedad 
}

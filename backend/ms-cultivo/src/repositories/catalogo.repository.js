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

module.exports = { listEspecies, listVariedadesByEspecie }

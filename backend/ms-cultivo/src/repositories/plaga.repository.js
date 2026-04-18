const { supabase } = require('../config/supabase')

const getPlagasByEspecie = async (idEspecie) => {
    // Consulta bridge: Traer plagas que tienen relación con la especie dada
    const { data, error } = await supabase
        .from('plaga_especie')
        .select(`
            id_plaga,
            plaga (
                id_plaga,
                nombre_cientifico,
                nombre_comun
            )
        `)
        .eq('id_especie', idEspecie)

    if (error) throw new Error(error.message)
    // Aplanamos el resultado para que sea más fácil de consumir
    return data.map(item => item.plaga)
}

const listAllPlagas = async () => {
    const { data, error } = await supabase
        .from('plaga')
        .select('*')
        .order('nombre_comun', { ascending: true })

    if (error) throw new Error(error.message)
    return data
}

module.exports = { getPlagasByEspecie, listAllPlagas }

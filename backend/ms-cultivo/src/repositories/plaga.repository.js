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

const upsertPlaga = async (nombre, idEspecie) => {
    // 1. Intentar buscar si la plaga ya existe por nombre (insensible a mayúsculas)
    const { data: existingPlaga, error: searchError } = await supabase
        .from('plaga')
        .select('id_plaga')
        .ilike('nombre_comun', nombre)
        .maybeSingle()

    if (searchError) throw new Error(searchError.message)

    let idPlaga

    if (existingPlaga) {
        idPlaga = existingPlaga.id_plaga
    } else {
        // 2. Si no existe, crearla
        const { data: newPlaga, error: insertError } = await supabase
            .from('plaga')
            .insert([{ 
                nombre_comun: nombre, 
                nombre_cientifico: `${nombre} (Pendiente identificación)` 
            }])
            .select()
            .single()
        
        if (insertError) throw new Error(insertError.message)
        idPlaga = newPlaga.id_plaga
    }

    // 3. Asegurar la relación con la especie en plaga_especie
    const { error: relError } = await supabase
        .from('plaga_especie')
        .upsert([{ id_plaga: idPlaga, id_especie: idEspecie }], {
            onConflict: 'id_plaga,id_especie'
        })

    if (relError) throw new Error(relError.message)

    return idPlaga
}

module.exports = { getPlagasByEspecie, listAllPlagas, upsertPlaga }

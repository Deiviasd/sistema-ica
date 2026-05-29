const { supabase } = require('../config/supabase')

const listEspecies = async () => {
    const { data, error } = await supabase
        .from('especie')
        .select('*, variedad(count)')
        .order('nombre_comun', { ascending: true })

    if (error) throw new Error(error.message)
    return data
}

const listVariedadesByEspecie = async (idEspecie) => {
    let query = supabase
        .from('variedad')
        .select('*, especie(id_especie, nombre_comun), siembra(count)')

    if (idEspecie) query = query.eq('id_especie', idEspecie)

    const { data, error } = await query
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

const updateEspecie = async (id, data) => {
    const { data: updated, error } = await supabase
        .from('especie')
        .update(data)
        .eq('id_especie', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return updated
}

const deleteEspecie = async (id) => {
    const { count, error: countError } = await supabase
        .from('variedad')
        .select('*', { count: 'exact', head: true })
        .eq('id_especie', id)

    if (countError) throw new Error(countError.message)
    if ((count || 0) > 0) throw new Error('No se puede eliminar una especie con variedades asociadas')

    const { error } = await supabase.from('especie').delete().eq('id_especie', id)
    if (error) throw new Error(error.message)
    return { success: true }
}

const updateVariedad = async (id, data) => {
    const { data: updated, error } = await supabase
        .from('variedad')
        .update(data)
        .eq('id_variedad', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return updated
}

const deleteVariedad = async (id) => {
    const { count, error: countError } = await supabase
        .from('siembra')
        .select('*', { count: 'exact', head: true })
        .eq('id_variedad', id)
        .is('fecha_fin', null)

    if (countError) throw new Error(countError.message)
    if ((count || 0) > 0) throw new Error('No se puede eliminar una variedad con siembras activas asociadas')

    const { error } = await supabase.from('variedad').delete().eq('id_variedad', id)
    if (error) throw new Error(error.message)
    return { success: true }
}

module.exports = { 
    listEspecies, 
    listVariedadesByEspecie,
    createEspecie,
    createVariedad,
    updateEspecie,
    deleteEspecie,
    updateVariedad,
    deleteVariedad
}

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

const getSiembras = async (userId = null, role = 'productor') => {
    // 🛡️ SEGURIDAD: Filtramos por productor_id para que el productor solo vea su propia información.
    let query = supabase
        .from('siembra')
        .select('*, variedad(nombre_variedad, especie(nombre_comun))');

    if (role !== 'ADMIN_ICA' && role !== 'admin' && userId) {
        const producerId = Number(userId);
        if (isNaN(producerId)) return [];
        query = query.eq('productor_id', producerId);
    }

    const { data, error } = await query;
    
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

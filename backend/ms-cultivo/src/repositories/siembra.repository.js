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

const getSiembras = async (userId = null, role = 'productor', id_lote = null, authorizedLoteIds = null) => {
    let query = supabase
        .from('siembra')
        .select(`
            *,
            variedad(id_especie, nombre_variedad, especie(id_especie, nombre_comun, ciclo))
        `);

    // 🛡️ Filtro por Lotes Autorizados (Orquestación Microservicios)
    if (authorizedLoteIds) {
        query = query.in('id_lote', authorizedLoteIds);
    }

    if (id_lote) {
        query = query.eq('id_lote', id_lote).is('fecha_fin', null);
    }

    const { data, error } = await query;
    
    if (error) {
        throw new Error(error.message);
    }
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

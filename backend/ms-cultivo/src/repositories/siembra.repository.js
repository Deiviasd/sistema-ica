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
    // 🛡️ SEGURIDAD: Si no es administrador y no tenemos cómo filtrar por dueño aún,
    // devolvemos vacío para no mostrar datos de otros productores en el dashboard.
    if (role !== 'ADMIN_ICA' && role !== 'admin') {
        console.log(`🧹 [MS-CULTIVO] Limpiando dashboard para productor ${userId}`);
        return []; 
    }

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

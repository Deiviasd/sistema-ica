const supabase = require('../configuracion/supabase');

class AuditoriaRepositorio {
    async insertarLog(log) {
        const { data, error } = await supabase
            .from('auditoria_logs')
            .insert([log])
            .select();
        
        if (error) throw error;
        return data;
    }

    async obtenerLogs({ from, to, filtros, search }) {
        let query = supabase
            .from('auditoria_logs')
            .select('*', { count: 'exact' })
            .order('fecha_hora', { ascending: false })
            .range(from, to);

        if (filtros.tipo_accion) query = query.eq('tipo_accion', filtros.tipo_accion);
        if (filtros.id_usuario) query = query.eq('id_usuario', filtros.id_usuario);
        if (filtros.rol) query = query.eq('rol', filtros.rol);
        
        if (filtros.fecha_inicio) query = query.gte('fecha_hora', filtros.fecha_inicio);
        if (filtros.fecha_fin) query = query.lte('fecha_hora', filtros.fecha_fin);

        if (search) {
            query = query.or(`nombre_usuario.ilike.%${search}%,tipo_accion.ilike.%${search}%,modulo.ilike.%${search}%`);
        }

        const { data, count, error } = await query;
        if (error) throw error;

        return { data, count };
    }

    async obtenerUltimoRegistro() {
        const { data, error } = await supabase
            .from('auditoria_logs')
            .select('fecha_hora')
            .limit(1);
        
        if (error) throw error;
        return data;
    }
}

module.exports = new AuditoriaRepositorio();

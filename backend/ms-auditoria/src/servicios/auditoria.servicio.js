const auditoriaRepositorio = require('../repositorios/auditoria.repositorio');

class AuditoriaServicio {
    isMissingAuditTable(error) {
        return error?.code === 'PGRST205' || error?.message?.includes("auditoria_logs");
    }

    async registrarLog(auditData) {
        const log = {
            id_usuario: auditData.id_usuario,
            nombre_usuario: auditData.nombre_usuario || 'Sistema',
            correo: auditData.correo || 'sistema@ica.gov.co',
            rol: auditData.rol || 'SISTEMA',
            tipo_accion: auditData.tipo_accion,
            modulo: auditData.modulo || 'GENERAL',
            descripcion: auditData.descripcion || auditData.mensaje || 'Acción registrada',
            ip: auditData.ip || '0.0.0.0',
            fecha_hora: auditData.timestamp || new Date().toISOString()
        };

        return await auditoriaRepositorio.insertarLog(log);
    }

    async obtenerLogsPaginados({ page = 1, limit = 20, filtros, search }) {
        const from = (page - 1) * limit;
        const to = from + parseInt(limit) - 1;

        const { data, count } = await auditoriaRepositorio.obtenerLogs({ from, to, filtros, search });

        return {
            logs: data,
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit)
        };
    }

    async verificarConexionBaseDatos() {
        return await auditoriaRepositorio.obtenerUltimoRegistro();
    }
}

module.exports = new AuditoriaServicio();

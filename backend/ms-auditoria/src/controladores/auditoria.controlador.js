const auditoriaServicio = require('../servicios/auditoria.servicio');

class AuditoriaControlador {
    async obtenerLogs(req, res) {
        try {
            const { 
                page = 1, 
                limit = 20, 
                tipo_accion, 
                id_usuario, 
                fecha_inicio, 
                fecha_fin,
                rol,
                search
            } = req.query;

            const filtros = { tipo_accion, id_usuario, fecha_inicio, fecha_fin, rol };
            const resultado = await auditoriaServicio.obtenerLogsPaginados({ 
                page, 
                limit, 
                filtros, 
                search 
            });

            return res.json(resultado);
        } catch (error) {
            console.error('❌ [MS-AUDITORIA]: Error al consultar logs:', error.message);
            
            if (auditoriaServicio.isMissingAuditTable(error)) {
                return res.json({
                    logs: [],
                    total: 0,
                    page: 1,
                    limit: 20,
                    pages: 0,
                    setup_required: true,
                    warning: 'La tabla public.auditoria_logs no existe en Supabase. Ejecuta backend/ms-auditoria/schema.sql.'
                });
            }

            return res.status(500).json({ error: 'Error al obtener los logs de auditoría' });
        }
    }

    async obtenerEstadoSalud(req, res) {
        try {
            await auditoriaServicio.verificarConexionBaseDatos();
            return res.json({
                status: 'Auditoría Activa',
                db_connected: true,
                sync_time: new Date()
            });
        } catch (error) {
            if (auditoriaServicio.isMissingAuditTable(error)) {
                return res.status(200).json({
                    status: 'Auditoría requiere configuración',
                    db_connected: true,
                    setup_required: true,
                    message: 'La tabla public.auditoria_logs no existe en Supabase. Ejecuta backend/ms-auditoria/schema.sql.'
                });
            }
            return res.status(500).json({ 
                status: 'Error', 
                db_connected: false, 
                message: error.message 
            });
        }
    }
}

module.exports = new AuditoriaControlador();

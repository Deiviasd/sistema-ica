const autenticacionServicio = require('../servicios/autenticacion.servicio');

class AutenticacionControlador {
    async registrar(req, res, next) {
        try {
            console.log(`🚀 [ORQUESTADOR] Iniciando registro integral para: ${req.body.email} | ID: ${req.correlationId}`);
            const result = await autenticacionServicio.registrarUsuario(req.body, req.correlationId);
            return res.status(201).json({
                success: true,
                message: 'Registro exitoso. Ahora puedes iniciar sesión.',
                user: result
            });
        } catch (error) {
            console.error('❌ [ORQUESTADOR] Error crítico en registro:', error.message || error);
            return res.status(error.status || 500).json({
                error: error.message || 'Error inesperado en el servidor'
            });
        }
    }

    async obtenerUsuariosPorEstado(req, res) {
        try {
            const { status } = req.query;
            console.log(`🔍 [ORQUESTADOR] Hidratando usuarios con estado: ${status}`);
            const users = await autenticacionServicio.obtenerUsuariosHidratados(status);
            return res.json(users);
        } catch (error) {
            const message = error.message || error.error || 'Error desconocido';
            console.error('❌ [ORQUESTADOR] Error hidratando usuarios:', message);
            return res.status(error.status || 500).json({ error: message });
        }
    }
}

module.exports = new AutenticacionControlador();

const orquestadorServicio = require('../servicios/orquestador.servicio');

class OrquestadorControlador {
    async crearLoteIntegral(req, res, next) {
        try {
            const result = await orquestadorServicio.crearLoteIntegral(req.user, req.body);
            return res.status(201).json({
                success: true,
                message: 'Registro integral exitoso',
                ...result
            });
        } catch (error) {
            next(error);
        }
    }

    async obtenerResumenDashboard(req, res) {
        try {
            const result = await orquestadorServicio.obtenerResumenDashboard(req.user);
            return res.json(result);
        } catch (error) {
            console.error('❌ [DASHBOARD] Error en endpoint combinado:', error.message);
            return res.status(500).json({ error: 'Error al cargar datos del dashboard' });
        }
    }
}

module.exports = new OrquestadorControlador();

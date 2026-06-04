const { Router } = require('express');
const orquestadorControlador = require('../controladores/orquestador.controlador');
const { authenticateToken } = require('../middlewares/autenticacion');

const router = Router();

// /api/orchestrator/lote-integral
router.post('/orchestrator/lote-integral', authenticateToken, orquestadorControlador.crearLoteIntegral);

// /api/dashboard/resumen
router.get('/dashboard/resumen', authenticateToken, orquestadorControlador.obtenerResumenDashboard);

module.exports = router;

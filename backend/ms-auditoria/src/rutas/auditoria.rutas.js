const { Router } = require('express');
const auditoriaControlador = require('../controladores/auditoria.controlador');

const router = Router();

router.get('/logs', auditoriaControlador.obtenerLogs);
router.get('/health', auditoriaControlador.obtenerEstadoSalud);

module.exports = router;

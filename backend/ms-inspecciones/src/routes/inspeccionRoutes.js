const express = require('express');
const router = express.Router();
const { authenticateInternal } = require('../middleware/authMiddleware');
const inspeccionController = require('../controllers/inspeccionController');

// --- Rutas Estáticas / Específicas primero (Evita colisiones con /:id) ---

// Reportes
router.get('/reporte', authenticateInternal, inspeccionController.getReporte);

// Asignaciones del Técnico
router.get('/asignadas', authenticateInternal, inspeccionController.getAsignadas);

// Agendamiento de Inspecciones
router.get('/lugar-produccion/:id/inspeccion-activa', inspeccionController.getInspeccionActivaLugar);
router.get('/predio/:id/inspeccion-activa', inspeccionController.getInspeccionActivaPredio);
router.post('/agendar', authenticateInternal, inspeccionController.postAgendar);

// Eliminar inspección completa
router.delete('/:id', authenticateInternal, inspeccionController.deleteInspeccion);

// Eliminar detalle/hallazgo de inspección
router.delete('/detalles/:id_detalle', authenticateInternal, inspeccionController.deleteDetalle);

// --- Rutas Dinámicas (/:id) después ---

// Contexto de Inspección
router.get('/:id/contexto', authenticateInternal, inspeccionController.getContexto);

// Detalles / Hallazgos de una inspección
router.post('/:id/detalles', authenticateInternal, inspeccionController.postDetalles);

// Finalizar Inspección
router.patch('/:id/finalizar', authenticateInternal, inspeccionController.patchFinalizar);

// Cancelar Inspección
router.patch('/:id/cancelar', authenticateInternal, inspeccionController.patchCancelar);

module.exports = router;

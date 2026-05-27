const express = require('express');
const router = express.Router();
const { authenticateInternal } = require('../middleware/authMiddleware');
const evidenceController = require('../controllers/evidenceController');

/**
 * Rutas para la gestión de evidencias fotográficas de inspecciones fitosanitarias.
 * Todas las rutas están protegidas con el middleware de autenticación interna.
 */

// Subir una nueva evidencia en base64
router.post('/upload', authenticateInternal, evidenceController.uploadEvidence);

// Consultar todas las evidencias asociadas a un detalle/lote inspeccionado
router.get('/detalle/:id_detalle', authenticateInternal, evidenceController.getEvidenceForDetail);

// Eliminar una evidencia sincronizada
router.delete('/:id_evidencia', authenticateInternal, evidenceController.deleteEvidence);

module.exports = router;

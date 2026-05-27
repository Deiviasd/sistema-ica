const evidenceService = require('../services/evidenceService');

/**
 * Controlador para gestionar las evidencias fotográficas de inspección.
 */

const uploadEvidence = async (req, res) => {
    try {
        const { id_detalle_inspeccion, foto_base64, latitud, longitud } = req.body;

        if (!id_detalle_inspeccion) {
            return res.status(400).json({ error: 'El campo id_detalle_inspeccion es obligatorio' });
        }
        if (!foto_base64) {
            return res.status(400).json({ error: 'La foto en formato Base64 es obligatoria' });
        }

        const evidencia = await evidenceService.guardarEvidencia(
            id_detalle_inspeccion,
            foto_base64,
            latitud,
            longitud
        );

        res.status(201).json({
            success: true,
            message: 'Evidencia fotográfica registrada con éxito',
            data: evidencia
        });
    } catch (error) {
        console.error('❌ Error en uploadEvidence controller:', error);
        res.status(500).json({
            error: 'Fallo al subir e integrar la evidencia fotográfica',
            details: error.message
        });
    }
};

const getEvidenceForDetail = async (req, res) => {
    try {
        const { id_detalle } = req.params;

        if (!id_detalle) {
            return res.status(400).json({ error: 'El id_detalle es obligatorio' });
        }

        const evidencias = await evidenceService.obtenerEvidenciasPorDetalle(id_detalle);
        res.json(evidencias);
    } catch (error) {
        console.error('❌ Error en getEvidenceForDetail controller:', error);
        res.status(500).json({
            error: 'Fallo al recuperar la lista de evidencias',
            details: error.message
        });
    }
};

module.exports = {
    uploadEvidence,
    getEvidenceForDetail
};

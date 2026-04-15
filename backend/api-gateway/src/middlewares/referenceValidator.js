const internalApi = require('../services/internalApi');

/**
 * Middleware para validar que los IDs referenciados existen en otros microservicios
 */
const validateReferences = {
    // Valida que el Productor existe en MS-AUTH
    productorExists: async (req, res, next) => {
        const id = req.body.productor_id || req.query.productor_id;
        if (!id) return next();

        try {
            await internalApi.auth.get(`/usuarios/${id}`);
            next();
        } catch (error) {
            next({ status: 404, message: `El Productor con ID ${id} no existe en el sistema.` });
        }
    },

    // Valida que el Técnico existe en MS-AUTH
    tecnicoExists: async (req, res, next) => {
        const id = req.body.tecnico_id || req.query.tecnico_id;
        if (!id) return next();

        try {
            await internalApi.auth.get(`/usuarios/${id}`);
            next();
        } catch (error) {
            next({ status: 404, message: `El Técnico con ID ${id} no existe o no está activo.` });
        }
    },

    // Valida que el Lote existe en MS-PREDIOS
    loteExists: async (req, res, next) => {
        const id = req.body.id_lote || req.query.id_lote;
        if (!id) return next();

        try {
            await internalApi.predios.get(`/lotes/${id}`);
            next();
        } catch (error) {
            next({ status: 404, message: `El Lote con ID ${id} no existe en MS-PREDIOS.` });
        }
    }
};

module.exports = validateReferences;

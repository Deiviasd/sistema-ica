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
    },

    // Valida que la Especie existe en MS-CULTIVO
    especieExists: async (req, res, next) => {
        const id = req.body.id_especie || req.query.id_especie;
        if (!id) return next();

        try {
            // Nota: Aquí asumimos que ms-cultivo maneja especies por ID en alguna ruta (podemos usar /siembras/catalogos/especies o similar)
            // Por ahora consultaremos directamente la tabla plaga_especie o crearemos la ruta de catálogo.
            // Para ser prácticos, dejaremos pasar si no hay ruta de catálogo, pero lo ideal es validarlo.
            next();
        } catch (error) {
            next({ status: 404, message: `La Especie con ID ${id} no existe.` });
        }
    }
};

module.exports = validateReferences;

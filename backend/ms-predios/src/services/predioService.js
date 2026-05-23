const predioRepository = require('../repositories/predioRepository');

const predioService = {
    async listLugares(userId, role) {
        if (role?.toLowerCase() === 'productor') {
            return await predioRepository.getLugaresByProductor(userId);
        }
        return await predioRepository.getAllLugares();
    },

    async listPredios(userId, role) {
        if (role?.toLowerCase() === 'productor') {
            return await predioRepository.getPrediosByProductor(userId);
        }
        return await predioRepository.getAllPredios();
    },

    async registerLugar(lugarData, userId) {
        return await predioRepository.createLugar({
            ...lugarData,
            productor_id: userId,
            updated_at: new Date().toISOString()
        });
    },

    async registerPredio(predioData) {
        const { 
            id_lugar_produccion, 
            nombre_predio, 
            numero_predial, 
            area_hectareas,
            id_region,
            departamento, municipio, vereda, direccion,
            prop_identificacion, prop_nombre, prop_telefono, prop_email,
            latitud, longitud
        } = predioData;

        // 🔒 Validar si el lugar de producción está bajo inspección
        const isUnderInspection = await predioRepository.isLugarUnderInspection(id_lugar_produccion);
        if (isUnderInspection) {
            throw new Error('No se pueden registrar predios en un lugar de producción que se encuentra bajo inspección activa.');
        }

        let finalRegionId = id_region;

        // Lógica de Negocio: Si no hay ID de región pero hay datos, la creamos automáticamente
        if (!finalRegionId && departamento && municipio) {
            const newRegion = await predioRepository.createRegion({ 
                departamento, municipio, vereda, direccion 
            });
            finalRegionId = newRegion.id_region;
        }

        return await predioRepository.createPredio({
            id_lugar_produccion,
            id_region: finalRegionId,
            nombre_predio,
            numero_predial,
            area_hectareas,
            prop_identificacion,
            prop_nombre,
            prop_telefono,
            prop_email,
            latitud,
            longitud
        });
    },

    async registerLote(loteData) {
        // 🔒 Validar si el predio está bajo inspección
        const isUnderInspection = await predioRepository.isPredioUnderInspection(loteData.id_predio);
        if (isUnderInspection) {
            throw new Error('No se pueden registrar lotes en un predio que se encuentra bajo inspección activa.');
        }

        return await predioRepository.createLote({
            ...loteData,
            estado: 'disponible'
        });
    },

    async registerRegion(regionData) {
        return await predioRepository.createRegion(regionData);
    },

    async getRegion(id) {
        return await predioRepository.getRegionById(id);
    },

    async removeRegion(id) {
        return await predioRepository.deleteRegion(id);
    },

    async getAllRegiones() {
        return await predioRepository.getRegiones();
    },

    async removeLote(id) {
        // 🔒 Validar si el lote está bajo inspección
        const isUnderInspection = await predioRepository.isLoteUnderInspection(id);
        if (isUnderInspection) {
            throw new Error('No se pueden eliminar lotes de un predio que se encuentra bajo inspección activa.');
        }

        return await predioRepository.deleteLote(id);
    },

    async removePredio(id) {
        // 🔒 Validar si el predio está bajo inspección activa
        const isUnderInspection = await predioRepository.isPredioUnderInspection(id);
        if (isUnderInspection) {
            throw new Error('No se puede eliminar un predio que se encuentra bajo inspección activa.');
        }

        return await predioRepository.deletePredio(id);
    }
};

module.exports = predioService;

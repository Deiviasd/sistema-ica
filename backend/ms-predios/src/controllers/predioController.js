const predioService = require('../services/predioService');

const predioController = {
    async getLugares(req, res) {
        try {
            const { id_usuario, role } = req.user;
            const data = await predioService.listLugares(id_usuario, role);
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getPredios(req, res) {
        try {
            const { id_usuario, role } = req.user;
            const data = await predioService.listPredios(id_usuario, role);
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async postLugar(req, res) {
        try {
            const data = await predioService.registerLugar(req.body, req.user.id_usuario);
            res.status(201).json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async postPredio(req, res) {
        try {
            const data = await predioService.registerPredio(req.body);
            res.status(201).json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async postLote(req, res) {
        try {
            const data = await predioService.registerLote(req.body);
            res.status(201).json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async postRegion(req, res) {
        try {
            const { departamento, municipio, vereda, direccion } = req.body;
            const data = await predioService.registerRegion({ departamento, municipio, vereda, direccion });
            res.status(201).json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getRegion(req, res) {
        try {
            const data = await predioService.getRegion(req.params.id);
            if (!data) return res.status(404).json({ error: 'Región no encontrada' });
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async deleteRegion(req, res) {
        try {
            const { id } = req.params;
            await predioService.removeRegion(id);
            res.status(200).json({ message: 'Región eliminada' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async listRegiones(req, res) {
        try {
            const data = await predioService.getAllRegiones();
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async deleteLote(req, res) {
        try {
            const { id } = req.params;
            await predioService.removeLote(id);
            res.status(200).json({ message: 'Lote eliminado exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async deletePredio(req, res) {
        try {
            const { id } = req.params;
            await predioService.removePredio(id);
            res.status(200).json({ message: 'Predio eliminado exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = predioController;

const inspeccionService = require('../services/inspeccionService');

/**
 * Controlador para gestionar el ciclo de vida de peticiones HTTP de inspecciones.
 */

const getContexto = async (req, res) => {
    try {
        const { id } = req.params;
        const resultado = await inspeccionService.obtenerContexto(id, req.user);
        res.json(resultado);
    } catch (error) {
        console.error('❌ Error en GET /contexto:', error);
        res.status(error.status || 500).json({
            error: error.message || 'Fallo al cargar contexto seguro',
            details: error.details || error
        });
    }
};

const postDetalles = async (req, res) => {
    try {
        const { id } = req.params;
        const items = Array.isArray(req.body) ? req.body : [req.body];

        const resultado = await inspeccionService.registrarDetalles(id, items);
        res.status(201).json(resultado);
    } catch (error) {
        console.error('❌ Error crítico en POST /detalles:', error);
        res.status(error.status || 500).json({
            error: 'Fallo al registrar hallazgo',
            details: error.message || error,
            hints: 'Verifique que los nombres de las columnas coincidan con el esquema de Supabase'
        });
    }
};

const deleteDetalle = async (req, res) => {
    try {
        const { id_detalle } = req.params;
        const resultado = await inspeccionService.eliminarDetalle(id_detalle);
        res.json(resultado);
    } catch (error) {
        console.error('❌ Error en DELETE /detalles/:id_detalle:', error);
        res.status(error.status || 500).json({ error: 'Fallo al eliminar detalle', details: error.message });
    }
};

const getReporte = async (req, res) => {
    try {
        const resultado = await inspeccionService.generarReporte(req.user);
        res.json(resultado);
    } catch (error) {
        console.error('❌ Error en GET /reporte:', error);
        res.status(error.status || 500).json({ error: 'Error en reporte', details: error.message });
    }
};

const getAsignadas = async (req, res) => {
    try {
        const resultado = await inspeccionService.obtenerAsignadas(req.user);
        res.json(resultado);
    } catch (error) {
        console.error('❌ Error fatal en /asignadas:', error);
        res.status(error.status || 500).json({ error: 'Error en asignaciones', message: error.message });
    }
};

const patchFinalizar = async (req, res) => {
    try {
        const { id } = req.params;
        const { observaciones_generales, estado } = req.body;

        const resultado = await inspeccionService.finalizarInspeccion(id, observaciones_generales, estado);
        res.json(resultado);
    } catch (error) {
        console.error('❌ Error en PATCH /finalizar:', error);
        res.status(error.status || 500).json({ error: 'Error interno al finalizar la inspección', details: error.message });
    }
};

const postAgendar = async (req, res) => {
    try {
        const resultado = await inspeccionService.agendarInspeccion(req.body, req.user);
        res.status(201).json(resultado);
    } catch (error) {
        console.error('💥 ERROR CRÍTICO EN AGENDAMIENTO:', error);
        res.status(error.status || 500).json({
            error: error.message || 'Fallo al procesar agendamiento',
            sugerencia: error.sugerencia,
            details: error.details
        });
    }
};

const patchCancelar = async (req, res) => {
    try {
        const { id } = req.params;
        const resultado = await inspeccionService.cancelarInspeccion(id, req.user);
        res.json(resultado);
    } catch (error) {
        console.error('❌ Error en PATCH /cancelar:', error);
        res.status(error.status || 500).json({ error: error.message || 'Error al cancelar la cita', details: error.details });
    }
};

const getInspeccionActivaLugar = async (req, res) => {
    try {
        const { id } = req.params;
        const resultado = await inspeccionService.obtenerInspeccionActivaLugar(id);
        res.json(resultado);
    } catch (error) {
        console.error('❌ Error en GET /lugar-produccion/:id/inspeccion-activa:', error);
        res.status(error.status || 500).json({ error: 'Error al consultar inspección activa' });
    }
};

const getInspeccionActivaPredio = async (req, res) => {
    try {
        const { id } = req.params;
        const resultado = await inspeccionService.obtenerInspeccionActivaPredio(id);
        res.json(resultado);
    } catch (error) {
        console.error('❌ Error en GET /predio/:id/inspeccion-activa:', error);
        res.status(error.status || 500).json({ error: 'Error al consultar inspección activa por predio' });
    }
};

module.exports = {
    getContexto,
    postDetalles,
    deleteDetalle,
    getReporte,
    getAsignadas,
    patchFinalizar,
    postAgendar,
    patchCancelar,
    getInspeccionActivaLugar,
    getInspeccionActivaPredio
};

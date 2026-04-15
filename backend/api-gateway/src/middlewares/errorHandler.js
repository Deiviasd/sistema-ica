/**
 * Middleware para capturar errores de forma centralizada
 */
const errorHandler = (err, req, res, next) => {
    console.error(`❌ [Error Orchestrator]: ${err.message || err}`);

    const status = err.status || 500;
    const message = err.message || 'Error interno en el Orquestador';

    res.status(status).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
        path: req.originalUrl
    });
};

module.exports = errorHandler;

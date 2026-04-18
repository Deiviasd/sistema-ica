/**
 * Middleware de manejo de errores global para el API Gateway.
 */
const errorHandler = (err, req, res, next) => {
    // 🕵️ DETECTIVE DE ERRORES: Imprimimos todo para capturar ese 403 fugitivo
    console.error('🕵️ GATEWAY ERROR DETECTED:');
    console.error('--- Mensaje:', err.message || err);
    console.error('--- Status:', err.status || 500);
    console.error('--- Origen:', req.originalUrl);
    
    if (err.response) {
        console.error('--- Response Data:', err.response.data);
        console.error('--- Response Status:', err.response.status);
    }

    const status = err.status || 500;
    const message = err.message || 'Error interno en el Gateway';

    res.status(status).json({
        error: true,
        status,
        message,
        details: err.details || null
    });
};

module.exports = errorHandler;

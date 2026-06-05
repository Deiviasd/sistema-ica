const { v4: uuidv4 } = require('uuid');

/**
 * Middleware de correlación.
 * Busca el x-correlation-id en los headers entrantes,
 * o genera uno nuevo si no existe.
 * Lo adjunta a req.correlationId para uso en logs y requests salientes.
 */
const correlacionMiddleware = (req, res, next) => {
    const correlationId = req.headers['x-correlation-id'] || uuidv4();
    req.correlationId = correlationId;
    
    // Devolvemos el ID en los headers de la respuesta para el frontend
    res.setHeader('x-correlation-id', correlationId);

    console.log(`[REQ] ${req.method} ${req.url} | ID: ${correlationId}`);
    next();
};

module.exports = correlacionMiddleware;

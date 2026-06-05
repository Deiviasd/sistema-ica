const rateLimit = require('express-rate-limit');

/**
 * Rate Limiter para endpoints de Login.
 * Permite 10 intentos cada 15 minutos por IP.
 * Protege contra ataques de fuerza bruta.
 */
const limitadorLogin = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Demasiados intentos de inicio de sesión. Por favor intenta de nuevo en 15 minutos.'
    },
    handler: (req, res, next, options) => {
        console.warn(`🚨 [RATE LIMIT] Login bloqueado para IP: ${req.ip} | ID: ${req.correlationId}`);
        res.status(429).json(options.message);
    }
});

/**
 * Rate Limiter para el Registro.
 * Permite 5 registros cada hora por IP.
 * Impide la creación masiva de cuentas automatizada.
 */
const limitadorRegistro = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Has excedido el límite de registros. Por favor intenta de nuevo en una hora.'
    },
    handler: (req, res, next, options) => {
        console.warn(`🚨 [RATE LIMIT] Registro bloqueado para IP: ${req.ip} | ID: ${req.correlationId}`);
        res.status(429).json(options.message);
    }
});

/**
 * Rate Limiter global para la API.
 * Permite 300 peticiones cada 5 minutos por IP.
 * Protege el gateway contra abuso general y ataques DDoS simples.
 */
const limitadorGeneral = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Demasiadas peticiones desde tu dirección IP. Por favor intenta de nuevo en unos minutos.'
    },
    skip: (req) => req.method === 'OPTIONS', // Dejar pasar los CORS preflight
    handler: (req, res, next, options) => {
        console.warn(`🚨 [RATE LIMIT] Límite global alcanzado para IP: ${req.ip} | ID: ${req.correlationId}`);
        res.status(429).json(options.message);
    }
});

module.exports = {
    limitadorLogin,
    limitadorRegistro,
    limitadorGeneral
};

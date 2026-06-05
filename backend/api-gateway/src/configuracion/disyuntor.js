const CircuitBreaker = require('opossum');

/**
 * Crea un Circuit Breaker configurado para una función asíncrona (como una llamada HTTP).
 * 
 * @param {Function} asyncFunction Función asíncrona a envolver
 * @param {Object} options Opciones de configuración de opossum (opcional)
 * @param {string} nombreServicio Nombre del servicio para logs (opcional)
 * @returns {CircuitBreaker} Instancia del Circuit Breaker
 */
function crearDisyuntor(asyncFunction, options = {}, nombreServicio = 'Servicio') {
    const defaultOptions = {
        timeout: 5000,               // Tiempo de espera antes de considerar que la función ha fallado (5 seg)
        errorThresholdPercentage: 50, // Porcentaje de errores antes de abrir el circuito
        resetTimeout: 10000          // Tiempo en que se intentará probar el circuito nuevamente tras abrirse (10 seg)
    };

    const breakerOptions = { ...defaultOptions, ...options };
    const breaker = new CircuitBreaker(asyncFunction, breakerOptions);

    breaker.fallback((...args) => {
        const errorMsg = args[args.length - 1]; // Opossum pasa el error como último argumento al fallback si se lanza
        console.error(`🛡️ [CIRCUIT BREAKER] Fallback ejecutado para ${nombreServicio}. Circuito abierto o fallo.`);
        throw new Error(`Servicio Temporalmente No Disponible (${nombreServicio})`);
    });

    breaker.on('open', () => console.warn(`🚨 [CIRCUIT BREAKER] Abierto para ${nombreServicio}`));
    breaker.on('halfOpen', () => console.warn(`⏳ [CIRCUIT BREAKER] Medio Abierto para ${nombreServicio} (probando...)`));
    breaker.on('close', () => console.log(`✅ [CIRCUIT BREAKER] Cerrado para ${nombreServicio} (operando normal)`));

    return breaker;
}

module.exports = crearDisyuntor;

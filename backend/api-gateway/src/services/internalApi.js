const axios = require('axios');

/**
 * Servicio para realizar peticiones internas entre microservicios
 * gestionadas por el Orquestador.
 */
const internalApi = {
    // Helper para llamadas a MS Auth
    auth: axios.create({ baseURL: process.env.AUTH_SERVICE_URL }),
    
    // Helper para llamadas a MS Predios
    predios: axios.create({ baseURL: process.env.PREDIOS_SERVICE_URL }),
    
    // Helper para llamadas a MS Cultivo
    cultivo: axios.create({ baseURL: process.env.CULTIVOS_SERVICE_URL }),
    
    // Helper para llamadas a MS Inspecciones
    inspecciones: axios.create({ baseURL: process.env.INSPECCIONES_SERVICE_URL }),
    
    // Helper para llamadas a MS Auditoria
    auditoria: axios.create({ baseURL: process.env.AUDITORIA_SERVICE_URL })
};

// Interceptor para propagar errores de forma limpia
const addErrorHandler = (instance) => {
    instance.interceptors.response.use(
        response => response,
        error => {
            const status = error.response ? error.response.status : 500;
            const message = error.response ? error.response.data.error : 'Error interno de microservicio';
            return Promise.reject({ status, message });
        }
    );
};

Object.values(internalApi).forEach(addErrorHandler);

module.exports = internalApi;

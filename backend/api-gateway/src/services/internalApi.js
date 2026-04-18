const axios = require('axios');
const jwt = require('jsonwebtoken');

/**
 * Servicio para realizar peticiones internas entre microservicios
 * gestionadas por el Orquestador con soporte de Token Exchange.
 */
const internalApi = {
    auth: axios.create({ baseURL: process.env.AUTH_SERVICE_URL }),
    predios: axios.create({ baseURL: process.env.PREDIOS_SERVICE_URL }),
    cultivo: axios.create({ baseURL: process.env.CULTIVOS_SERVICE_URL }),
    inspecciones: axios.create({ baseURL: process.env.INSPECCIONES_SERVICE_URL }),
    auditoria: axios.create({ baseURL: process.env.AUDITORIA_SERVICE_URL }),

    /**
     * Helper para obtener los headers con el token re-firmado para un microservicio
     * @param {Object} user - El objeto req.user (decodificado)
     * @param {String} targetSecretEnv - Secreto del microservicio destino
     */
    getAuthHeaders: (user, targetSecretEnv) => {
        if (!user) return {};
        
        // LIMPIEZA: Extraemos solo lo necesario y eliminamos claims antiguos (exp, iat)
        const { iat, exp, ...cleanUser } = user;
        
        // ASEGURAR: Supabase exige 'role' y 'id_usuario' (para tu RLS personalizado)
        const payload = {
            ...cleanUser,
            id: cleanUser.id || cleanUser.sub || cleanUser.id_usuario, // Normalización del ID
            role: cleanUser.role || cleanUser.app_metadata?.role || 'authenticated',
            aud: 'authenticated'
        };

        const targetSecret = process.env[targetSecretEnv].trim();
        const newToken = jwt.sign(payload, targetSecret, { expiresIn: '1h' });
        
        return { 
            headers: { 
                Authorization: `Bearer ${newToken}`,
                'Content-Type': 'application/json'
            } 
        };
    }
};

// Interceptor para propagar errores de forma limpia
const addErrorHandler = (instance) => {
    instance.interceptors.response.use(
        response => response,
        error => {
            const status = error.response ? error.response.status : 500;
            const message = error.response ? error.response.data.error || error.response.data.message : 'Error interno de microservicio';
            return Promise.reject({ status, message });
        }
    );
};

Object.values(internalApi).forEach(instance => {
    if (typeof instance !== 'function') addErrorHandler(instance);
});

module.exports = internalApi;

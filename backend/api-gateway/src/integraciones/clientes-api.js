const axios = require('axios');
const jwt = require('jsonwebtoken');
const axiosRetry = require('axios-retry').default;

console.log("🔍 [CLIENTES_API] Iniciando configuración de microservicios con soporte de Resiliencia...");
console.log("🔑 [CLIENTES_API] INTERNAL_API_KEY detectada:", process.env.INTERNAL_API_KEY ? "SÍ" : "NO");

const serviceUrl = (value) => (value || '').replace(/\/+$/, '');

const clientesApi = {
    auth: axios.create({ baseURL: `${serviceUrl(process.env.AUTH_SERVICE_URL)}/auth` }),
    predios: axios.create({ baseURL: serviceUrl(process.env.PREDIOS_SERVICE_URL) }),
    cultivo: axios.create({ baseURL: serviceUrl(process.env.CULTIVOS_SERVICE_URL) }),
    inspecciones: axios.create({ baseURL: serviceUrl(process.env.INSPECCIONES_SERVICE_URL) }),
    auditoria: axios.create({ baseURL: serviceUrl(process.env.AUDITORIA_SERVICE_URL) }),

    /**
     * Helper para obtener los headers con el token re-firmado y Correlation ID
     * @param {Object} req - Objeto de petición Express (contiene req.user y req.correlationId)
     * @param {String} targetSecretEnv - Secreto del microservicio destino
     */
    getAuthHeaders: (req, targetSecretEnv) => {
        const user = req.user;
        const headers = {
            'Content-Type': 'application/json',
            'x-correlation-id': req.correlationId || 'N/A' // Propagación de ID de trazabilidad
        };

        if (!user) return { headers };

        const { iat, exp, ...cleanUser } = user;
        const payload = {
            sub: cleanUser.id_auth_supabase || cleanUser.sub || cleanUser.id,
            id_usuario: cleanUser.id_usuario,
            email: cleanUser.email,
            role: 'authenticated',
            app_metadata: {
                role: cleanUser.role || cleanUser.app_metadata?.role || 'productor'
            },
            aud: 'authenticated'
        };

        const targetSecret = (process.env[targetSecretEnv] || "").trim();
        if (targetSecret) {
            const newToken = jwt.sign(payload, targetSecret, { expiresIn: '1h' });
            headers.Authorization = `Bearer ${newToken}`;
        }

        return { headers };
    }
};

// Configuración de Interceptores y Políticas de Reintento
const setupInstance = (instance, serviceName) => {
    // 🛡️ Política de Retries (Resiliencia)
    axiosRetry(instance, { 
        retries: 3, // Reintentar hasta 3 veces
        retryDelay: axiosRetry.exponentialDelay, // Retraso exponencial: 100ms, 200ms, 400ms...
        retryCondition: (error) => {
            // Reintentar si hay error de red o error de servidor (5xx)
            return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status >= 500;
        },
        onRetry: (retryCount, error, requestConfig) => {
            console.warn(`🔄 [RETRY] Intentando de nuevo (${retryCount}/3) a ${serviceName}. Razón: ${error.message}`);
        }
    });

    // 🔑 Inyectar LLAVE MAESTRA en cada petición
    instance.interceptors.request.use(config => {
        config.headers['x-internal-key'] = process.env.INTERNAL_API_KEY;
        return config;
    });

    // 🔴 Manejo de errores simplificado para el orquestador
    instance.interceptors.response.use(
        response => response,
        error => {
            const status = error.response ? error.response.status : 503;
            const message = error.response ? error.response.data?.error || error.response.data?.message || error.message : 'Servicio temporalmente inaccesible o error de red';
            return Promise.reject({ status, message, originalError: error });
        }
    );
};

setupInstance(clientesApi.auth, 'MS-Auth');
setupInstance(clientesApi.predios, 'MS-Predios');
setupInstance(clientesApi.cultivo, 'MS-Cultivo');
setupInstance(clientesApi.inspecciones, 'MS-Inspecciones');
setupInstance(clientesApi.auditoria, 'MS-Auditoria');

module.exports = clientesApi;

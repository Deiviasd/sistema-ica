const axios = require('axios');
const jwt = require('jsonwebtoken');

console.log("🔍 [CLIENTES_API] Iniciando configuración de microservicios...");
console.log("🔑 [CLIENTES_API] INTERNAL_API_KEY detectada:", process.env.INTERNAL_API_KEY ? "SÍ" : "NO");

const serviceUrl = (value) => (value || '').replace(/\/+$/, '');

const clientesApi = {
    auth: axios.create({ baseURL: `${serviceUrl(process.env.AUTH_SERVICE_URL)}/auth` }),
    predios: axios.create({ baseURL: serviceUrl(process.env.PREDIOS_SERVICE_URL) }),
    cultivo: axios.create({ baseURL: serviceUrl(process.env.CULTIVOS_SERVICE_URL) }),
    inspecciones: axios.create({ baseURL: serviceUrl(process.env.INSPECCIONES_SERVICE_URL) }),
    auditoria: axios.create({ baseURL: serviceUrl(process.env.AUDITORIA_SERVICE_URL) }),

    /**
     * Helper para obtener los headers con el token re-firmado para un microservicio
     * @param {Object} user - El objeto req.user (decodificado)
     * @param {String} targetSecretEnv - Secreto del microservicio destino
     */
    getAuthHeaders: (user, targetSecretEnv) => {
        if (!user) return {};

        // LIMPIEZA: Extraemos solo lo necesario y eliminamos claims antiguos (exp, iat)
        const { iat, exp, ...cleanUser } = user;

        // ASEGURAR: Payload estabilizado para Supabase
        const payload = {
            sub: cleanUser.id_auth_supabase || cleanUser.sub || cleanUser.id,
            id_usuario: cleanUser.id_usuario,
            email: cleanUser.email,
            role: 'authenticated', // Rol base de Supabase
            app_metadata: {
                role: cleanUser.role || cleanUser.app_metadata?.role || 'productor'
            },
            aud: 'authenticated'
        };

        const headers = {
            'Content-Type': 'application/json'
        };

        const targetSecret = (process.env[targetSecretEnv] || "").trim();
        if (targetSecret) {
            const newToken = jwt.sign(payload, targetSecret, { expiresIn: '1h' });
            headers.Authorization = `Bearer ${newToken}`;
        }

        return { headers };
    }
};

// Configuración de Interceptores y Errores
const setupInstance = (instance) => {
    // 🔑 Inyectar LLAVE MAESTRA en cada petición
    instance.interceptors.request.use(config => {
        config.headers['x-internal-key'] = process.env.INTERNAL_API_KEY;
        return config;
    });

    // 🔴 Manejo de errores
    instance.interceptors.response.use(
        response => response,
        error => {
            const status = error.response ? error.response.status : 500;
            const message = error.response ? error.response.data?.error || error.response.data?.message || error.message : 'Error interno de microservicio';
            return Promise.reject({ status, message });
        }
    );
};

// Aplicar a todas las instancias
setupInstance(clientesApi.auth);
setupInstance(clientesApi.predios);
setupInstance(clientesApi.cultivo);
setupInstance(clientesApi.inspecciones);
setupInstance(clientesApi.auditoria);

module.exports = clientesApi;

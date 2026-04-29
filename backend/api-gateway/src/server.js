const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createProxyMiddleware } = require('http-proxy-middleware');
const internalApi = require('./services/internalApi');
const eventBus = require('./services/eventBus');
const errorHandler = require('./middlewares/errorHandler');
const validator = require('./middlewares/referenceValidator');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(cors());

// 🔌 Conectar a RabbitMQ al iniciar
eventBus.connect();

// 🔐 Middleware de autenticación (Token Swapper)
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Token requerido' });

    try {
        // En ms-auth firmamos con el secreto como string, aquí validamos igual
        const secret = (process.env.JWT_SECRET_AUTH || process.env.JWT_SECRET || "").trim();

        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
            try {
                const header = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString());
                console.log(`🔍 [JWT DEBUG] Header:`, JSON.stringify(header));
            } catch (e) { }
        }
        console.log(`🔍 [JWT DEBUG] Secret Length: ${secret.length}`);

        // jwt.verify detecta el algoritmo automáticamente
        const decoded = jwt.verify(token, secret);

        // 🔄 Mapeo de compatibilidad
        req.user = {
            ...decoded,
            id: decoded.id || decoded.sub,
            id_usuario: decoded.id_usuario || decoded.sub
        };

        console.log(`🔑 [JWT DEBUG] Token decodificado para: ${req.user.email}`);
        next();
    } catch (err) {
        console.error('❌ Error de validación en Gateway:', err.message);
        // 🚨 IMPORTANTE: 401 para que el frontend limpie el localStorage
        return res.status(401).json({ error: 'Sesión expirada o inválida', details: err.message });
    }
}

// 🛡️ Middleware de Autorización por Roles
const restrictTo = (...roles) => {
    return (req, res, next) => {
        // Permitir OPTIONS preflight
        if (req.method === 'OPTIONS') return next();

        // El rol viene en app_metadata.role según el JWT de ms-auth
        const userRole = req.user?.app_metadata?.role;

        console.log(`🛡️ [AUTH DEBUG] Ruta: ${req.originalUrl} | Rol Usuario: ${userRole} | Requerido: ${roles}`);

        if (!roles.includes(userRole)) {
            return res.status(403).json({
                error: 'No tienes permisos para acceder a este recurso'
            });
        }
        next();
    };
};

// ==========================================
// 🚀 ORQUESTACIÓN ASÍNCRONA
// ==========================================
app.post('/api/orchestrator/lote-integral', authenticateToken, async (req, res, next) => {
    let loteId = null;
    let siembraId = null;
    try {
        const {
            id_lugar_produccion, nombre_lote, area_m2, especie, variedad, fecha_siembra
        } = req.body;

        const loteResponse = await internalApi.predios.post('/lotes', {
            id_lugar_produccion, nombre_lote, area_m2
        }, internalApi.getAuthHeaders(req.user, 'JWT_SECRET_PREDIOS'));

        loteId = loteResponse.data.id_lote;

        const siembraResponse = await internalApi.cultivo.post('/siembras', {
            id_lote: loteId,
            id_variedad: 1,
            fecha_siembra
        }, internalApi.getAuthHeaders(req.user, 'JWT_SECRET_CULTIVOS'));

        siembraId = siembraResponse.data.id_siembra;

        eventBus.publish('audit_queue', {
            modulo: 'registro_agricola',
            tipo_accion: 'CREATE_LOTE_INTEGRAL',
            id_referencia: `Lote:${loteId}|Siembra:${siembraId}`,
            id_usuario: req.user.id,
            timestamp: new Date().toISOString()
        });

        res.status(201).json({
            success: true,
            message: 'Registro integral exitoso',
            lote: loteResponse.data,
            siembra: siembraResponse.data
        });
    } catch (error) {
        console.error('❌ Error en Registro Integral:', error.message);
        if (loteId && !siembraId) {
            await internalApi.predios.patch(`/lotes/${loteId}/estado`, { estado: 'disponible' }).catch(() => { });
        }
        next(error);
    }
});

// ==========================================
// 🔁 PROXIES CON TOKEN EXCHANGE
// ==========================================
const setupProxy = (path, target, validators = [], protected = true, targetSecretEnv = null) => {
    const middlewares = protected ? [authenticateToken, ...validators] : [...validators];
    app.use(path, ...middlewares, createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: { [`^${path}`]: '' },
        onProxyReq: (proxyReq, req, res) => {
            // 🔄 TOKEN EXCHANGE: Si el destino tiene una llave diferente, re-firmamos
            if (protected && targetSecretEnv && process.env[targetSecretEnv]) {
                const targetSecret = process.env[targetSecretEnv].trim();

                // 🎭 Payload universal compatible con todos los MS y Supabase
                const payload = {
                    id: req.user.id_usuario || req.user.id, // Para MS-CULTIVO
                    id_usuario: req.user.id_usuario || req.user.id, // Para MS-AUTH/PREDIOS
                    sub: req.user.id_auth_supabase || req.user.sub || req.user.id,
                    email: req.user.email,
                    nombre: req.user.nombre, // ✨ Mantenemos el nombre en el intercambio
                    nombre_predio: req.user.nombre_predio, // ✨ Nueva info de la finca
                    numero_predial: req.user.numero_predial, // ✨ Criterio oficial del predio
                    role: req.user.app_metadata?.role || req.user.role || 'authenticated',
                    aud: 'authenticated',
                    app_metadata: req.user.app_metadata || {}
                };

                const newToken = jwt.sign(payload, targetSecret);
                console.log(`🎫 [TOKEN EXCHANGE] Re-firmando para ${target} con payload universal`);
                proxyReq.setHeader('Authorization', `Bearer ${newToken}`);

                // 🆔 INYECCIÓN DE IDENTIDAD: Pasamos datos limpios a los microservicios
                proxyReq.setHeader('x-user-id', payload.id_usuario);
                proxyReq.setHeader('x-user-role', payload.role);
                proxyReq.setHeader('x-user-predio-id', payload.numero_predial || '');
            }

            if (req.body) {
                const bodyData = JSON.stringify(req.body);
                proxyReq.setHeader('Content-Type', 'application/json');
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                proxyReq.write(bodyData);
            }
        },
        onProxyRes: (proxyRes, req, res) => {
            // 🕵️ AUDITORÍA GLOBAL DESDE EL ORQUESTADOR
            const isModifying = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
            const isSuccess = proxyRes.statusCode >= 200 && proxyRes.statusCode < 300;

            // Si el Gateway ve que pasó una creación/edición de cualquier microservicio, ¡él mismo levanta el evento!
            if (isModifying && isSuccess) {
                const actorId = req.user?.id_usuario || req.user?.sub || 'sistema';
                eventBus.publish('audit_queue', {
                    modulo: req.originalUrl.split('/')[1] || 'gateway',
                    tipo_accion: `${req.method}_${req.originalUrl}`,
                    id_referencia: `HTTP ${proxyRes.statusCode}`,
                    id_usuario: actorId,
                    timestamp: new Date().toISOString(),
                    descripcion: `Acción ${req.method} orquestada hacia ${target}`
                });
            }
        }
    }));
};

// 🔐 Microservicio de Autenticación (Login, Register, Profile, Gestión de Usuarios)
// Usamos un middleware manual para proteger solo ciertas rutas
app.use('/auth', (req, res, next) => {
    const publicPaths = ['/login', '/register', '/catalogos'];
    const isPublic = publicPaths.some(path => req.path.startsWith(path));

    if (isPublic) return next();

    // Rutas que requieren ADMIN_ICA
    if (req.path.startsWith('/pending') || req.path.startsWith('/users')) {
        return authenticateToken(req, res, () => restrictTo('admin')(req, res, next));
    }

    // El resto requiere al menos estar autenticado (profile, etc)
    return authenticateToken(req, res, next);
}, createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
        if (req.body) {
            const bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
        }
        console.log(`📡 [PROXY] Forwarding ${req.method} ${req.originalUrl} -> ms-auth`);
    }
}));

// 🚜 Microservicios de Negocio (Usan pathRewrite porque no esperan /predios o /cultivos internamente)
setupProxy('/predios', process.env.PREDIOS_SERVICE_URL, [validator.productorExists], true, 'JWT_SECRET_PREDIOS');
setupProxy('/cultivos', process.env.CULTIVOS_SERVICE_URL, [], true, 'JWT_SECRET_CULTIVOS');
setupProxy('/inspecciones', process.env.INSPECCIONES_SERVICE_URL, [validator.productorExists, validator.tecnicoExists], true, 'JWT_SECRET_INSPECCIONES');
setupProxy('/auditoria', process.env.AUDITORIA_SERVICE_URL, [restrictTo('admin')], true, 'JWT_SECRET_AUDITORIA');

app.get('/health', (req, res) => res.json({ status: 'Orchestrator Online [Token Swapper Active]' }));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`📡 Orquestador ICA activo en puerto ${PORT} con soporte Multi-Cuenta`);
});
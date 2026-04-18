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
        token = token.trim().replace(/\s/g, '');
        // 🔐 Validamos con la llave maestra de Auth
        const secret = (process.env.JWT_SECRET_AUTH || process.env.JWT_SECRET).trim();
        const decoded = jwt.verify(token, secret);

        req.user = decoded;
        next();
    } catch (err) {
        console.error('❌ Error de validación JWT:', err.message);
        return res.status(403).json({ error: 'Token inválido o expirado' });
    }
}

// 🛡️ Middleware de Autorización por Roles
const restrictTo = (...roles) => {
    return (req, res, next) => {
        // El rol viene en app_metadata.role según el JWT de ms-auth
        const userRole = req.user?.app_metadata?.role;
        
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
            id_lugar_produccion, nombre_lote, area_m2, estado: 'ocupado'
        });
        loteId = loteResponse.data.id_lote;

        const siembraResponse = await internalApi.cultivo.post('/siembras', {
            id_lote: loteId, especie, variedad, fecha_siembra, estado: 'activa'
        });
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
            await internalApi.predios.patch(`/lotes/${loteId}/estado`, { estado: 'inactivo' }).catch(() => { });
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
            // 🔄 Intercambio de tokens para RLS de múltiples cuentas
            if (protected && targetSecretEnv && process.env[targetSecretEnv]) {
                const targetSecret = process.env[targetSecretEnv].trim();
                const newToken = jwt.sign(req.user, targetSecret);
                proxyReq.setHeader('Authorization', `Bearer ${newToken}`);
            }

            if (req.body) {
                const bodyData = JSON.stringify(req.body);
                proxyReq.setHeader('Content-Type', 'application/json');
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                proxyReq.write(bodyData);
            }
        }
    }));
};

setupProxy('/auth', process.env.AUTH_SERVICE_URL, [], false);
setupProxy('/predios', process.env.PREDIOS_SERVICE_URL, [validator.productorExists], true, 'JWT_SECRET_PREDIOS');
setupProxy('/cultivos', process.env.CULTIVOS_SERVICE_URL, [validator.loteExists], true, 'JWT_SECRET_CULTIVOS');
setupProxy('/inspecciones', process.env.INSPECCIONES_SERVICE_URL, [validator.productorExists, validator.tecnicoExists], true, 'JWT_SECRET_INSPECCIONES');
setupProxy('/auditoria', process.env.AUDITORIA_SERVICE_URL, [restrictTo('admin')], true, 'JWT_SECRET_AUDITORIA');

app.get('/health', (req, res) => res.json({ status: 'Orchestrator Online [Token Swapper Active]' }));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`📡 Orquestador ICA activo en puerto ${PORT} con soporte Multi-Cuenta`);
});
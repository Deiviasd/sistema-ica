const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createProxyMiddleware } = require('http-proxy-middleware');
const internalApi = require('./services/internalApi');
const eventBus = require('./services/eventBus'); // 🚌 Nuevo Event Bus
const errorHandler = require('./middlewares/errorHandler');
const validator = require('./middlewares/referenceValidator');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(cors());

// 🔌 Conectar a RabbitMQ al iniciar
eventBus.connect();

// 🔐 Middleware de autenticación
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Token requerido' });

    try {
        // 🔥 Corregido: Usar la llave maestra de Auth definida en el .env
        const decoded = jwt.verify(token, process.env.JWT_SECRET_AUTH);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Token inválido o expirado' });
    }
}

// 🛡️ Middleware de Autorización por Roles
const restrictTo = (...roles) => {
    return (req, res, next) => {
        // En Fase 3, el rol viene en app_metadata.role (según roadmap)
        const userRole = req.user.app_metadata?.role;
        
        if (!roles.includes(userRole)) {
            return res.status(403).json({ 
                error: 'No tienes permisos para acceder a este recurso' 
            });
        }
        next();
    };
};

// ==========================================
// 🚀 ORQUESTACIÓN ASÍNCRONA (FASE 3)
// ==========================================

app.post('/api/orchestrator/siembras', authenticateToken, validator.loteExists, async (req, res, next) => {
    let siembraId = null;
    try {
        const { id_lote } = req.body;

        // 1. Paso Síncrono: Crear siembra en ms-cultivo
        const siembraResponse = await internalApi.cultivo.post('/siembras', req.body);
        siembraId = siembraResponse.data.id_siembra;
        
        // 2. Transacción Distribuida (SAGA): Ocupar el lote en ms-predios
        await internalApi.predios.patch(`/lotes/${id_lote}/state`, {
            estado: 'ocupado'
        });

        // 3. Notificación Asíncrona: Auditoría
        eventBus.publish('audit_queue', {
            modulo: 'transacciones',
            tipo_accion: 'CREATE_SIEMBRA_WITH_LOT_STATE',
            id_referencia: siembraId,
            id_usuario: req.user.id,
            timestamp: new Date().toISOString()
        });

        res.status(201).json({
            success: true,
            message: 'Siembra registrada y Lote ocupado correctamente',
            data: siembraResponse.data
        });

    } catch (error) {
        console.error('❌ Error en Orquestación Siembra:', error.message);
        
        // COMPENSACIÓN: Si falló el paso 2, intentamos borrar la siembra creada
        if (siembraId) {
            console.log('🔄 Ejecutando compensación: Borrando siembra inducida...');
            await internalApi.cultivo.delete(`/siembras/${siembraId}`).catch(e => console.error('Error en compensación:', e.message));
        }

        next(error);
    }
});

// ==========================================
// 🔁 PROXIES CONFIGURADOS
// ==========================================

const setupProxy = (path, target, validators = [], protected = true) => {
    const middlewares = protected ? [authenticateToken, ...validators] : [...validators];
    app.use(path, ...middlewares, createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: { [`^${path}`]: '' },
        onProxyReq: (proxyReq, req, res) => {
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
setupProxy('/predios', process.env.PREDIOS_SERVICE_URL, [validator.productorExists]);
setupProxy('/cultivos', process.env.CULTIVOS_SERVICE_URL, [validator.loteExists]);
setupProxy('/inspecciones', process.env.INSPECCIONES_SERVICE_URL, [validator.productorExists, validator.tecnicoExists]);
setupProxy('/auditoria', process.env.AUDITORIA_SERVICE_URL, [restrictTo('admin')]);

// Health
app.get('/health', (req, res) => res.json({ status: 'Orchestrator Phase 3 Online (RabbitMQ Active)' }));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`📡 Orquestador ICA [FASE 3] activo en puerto ${PORT}`);
});
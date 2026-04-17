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
    let token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Token requerido' });

    try {
        token = token.trim().replace(/\s/g, '');
        // 🔹 Usamos la llave como texto plano (descubierto por prueba-adn)
        const secret = process.env.JWT_SECRET.trim();
        const decoded = jwt.verify(token, secret);
        
        req.user = decoded;
        next();
    } catch (err) {
        console.error('❌ Error de validación en Gateway:', err.message);
        return res.status(403).json({ error: 'Token inválido o expirado', details: err.message });
    }
}

// ==========================================
// 🚀 ORQUESTACIÓN ASÍNCRONA (FASE 3)
// ==========================================

/**
 * REGISTRO INTEGRAL DE LOTE (Lote + Siembra)
 * Cumple con la secuencia: Formulario unificado de dos secciones
 */
app.post('/api/orchestrator/lote-integral', authenticateToken, async (req, res, next) => {
    let loteId = null;
    let siembraId = null;

    try {
        const { 
            id_lugar_produccion, nombre_lote, area_m2, // Sección 1: Datos Lote
            especie, variedad, fecha_siembra           // Sección 2: Datos Siembra
        } = req.body;

        // 1. Paso Síncrono: Registrar el Lote en MS-Predios
        const loteResponse = await internalApi.predios.post('/lotes', {
            id_lugar_produccion,
            nombre_lote,
            area_m2,
            estado: 'ocupado' // El sistema lo marca como ocupado automáticamente
        });
        loteId = loteResponse.data.id_lote;

        // 2. Paso Síncrono: Registrar la Siembra en MS-Cultivo vinculada al nuevo Lote
        const siembraResponse = await internalApi.cultivo.post('/siembras', {
            id_lote: loteId,
            especie,
            variedad,
            fecha_siembra,
            estado: 'activa'
        });
        siembraId = siembraResponse.data.id_siembra;

        // 3. Notificación Asíncrona: Auditoría de registro unificado
        eventBus.publish('audit_queue', {
            modulo: 'registro_agricola',
            tipo_accion: 'CREATE_LOTE_INTEGRAL',
            id_referencia: `Lote:${loteId}|Siembra:${siembraId}`,
            id_usuario: req.user.id,
            timestamp: new Date().toISOString()
        });

        res.status(201).json({
            success: true,
            message: 'Registro integral exitoso (Paso 8 y 9 cumplidos)',
            lote: loteResponse.data,
            siembra: siembraResponse.data
        });

    } catch (error) {
        console.error('❌ Error en Registro Integral:', error.message);
        
        // COMPENSACIÓN (Patrón SAGA): Si el lote se creó pero la siembra falló, 
        // marcamos el lote como 'inactivo' para mantener trazabilidad pero evitar su uso.
        if (loteId && !siembraId) {
            console.log('🔄 Ejecutando compensación: Marcando lote como inactivo...');
            await internalApi.predios.patch(`/lotes/${loteId}/estado`, {
                estado: 'inactivo'
            }).catch(e => console.error('Error en compensación:', e.message));
        }

        next(error);
    }
});

// Mantengo el endpoint existente para siembras en lotes ya creados
app.post('/api/orchestrator/siembras', authenticateToken, validator.loteExists, async (req, res, next) => {
    let siembraId = null;
    try {
        const { id_lote } = req.body;
        const siembraResponse = await internalApi.cultivo.post('/siembras', req.body);
        siembraId = siembraResponse.data.id_siembra;
        
        await internalApi.predios.patch(`/lotes/${id_lote}/state`, { estado: 'ocupado' });

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
        if (siembraId) {
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
setupProxy('/auditoria', process.env.AUDITORIA_SERVICE_URL);

// Health
app.get('/health', (req, res) => res.json({ status: 'Orchestrator Phase 3 Online (RabbitMQ Active)' }));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`📡 Orquestador ICA [FASE 3] activo en puerto ${PORT}`);
});
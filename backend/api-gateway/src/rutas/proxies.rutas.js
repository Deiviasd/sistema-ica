const { Router } = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const { authenticateToken, restrictTo } = require('../middlewares/autenticacion');
const validator = require('../middlewares/referenceValidator');
const eventBus = require('../configuracion/eventbus');

const router = Router();

const setupProxy = (path, target, validators = [], protected = true, targetSecretEnv = null) => {
    const middlewares = protected ? [authenticateToken, ...validators] : [...validators];
    
    router.use(path, ...middlewares, createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: { [`^${path}`]: '' },
        onProxyReq: (proxyReq, req, res) => {
            const payload = {
                id: req.user.id_usuario || req.user.id,
                id_usuario: req.user.id_usuario || req.user.id,
                sub: req.user.id_auth_supabase || req.user.sub || req.user.id,
                email: req.user.email,
                nombre: req.user.nombre,
                nombre_predio: req.user.nombre_predio,
                numero_predial: req.user.numero_predial,
                role: req.user.app_metadata?.role || req.user.role || 'authenticated',
                aud: 'authenticated',
                app_metadata: req.user.app_metadata || {}
            };

            // 🆔 INYECCIÓN DE IDENTIDAD Y TRAZABILIDAD: Pasamos datos limpios a los microservicios
            proxyReq.setHeader('x-user-id', payload.id_usuario);
            proxyReq.setHeader('x-user-role', payload.role);
            proxyReq.setHeader('x-user-predio-id', payload.numero_predial || '');
            proxyReq.setHeader('x-correlation-id', req.correlationId || 'N/A');

            // 🔄 TOKEN EXCHANGE: Si el destino tiene una llave diferente, re-firmamos
            if (protected && targetSecretEnv && process.env[targetSecretEnv]) {
                const targetSecret = process.env[targetSecretEnv].trim();
                const newToken = jwt.sign(payload, targetSecret);
                console.log(`🎫 [TOKEN EXCHANGE] Re-firmando para ${target} con payload universal`);
                proxyReq.setHeader('Authorization', `Bearer ${newToken}`);
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

            if (isModifying && isSuccess) {
                const actorId = req.user?.id_usuario || req.user?.sub || 'sistema';
                const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

                eventBus.publish('audit_queue', {
                    modulo: req.originalUrl.split('/')[1] || 'gateway',
                    tipo_accion: `${req.method}_${req.originalUrl.split('?')[0]}`,
                    id_usuario: actorId,
                    nombre_usuario: req.user?.nombre || req.user?.email || 'Desconocido',
                    correo: req.user?.email || 'N/A',
                    rol: req.user?.app_metadata?.role || req.user?.role || 'authenticated',
                    ip: clientIp,
                    timestamp: new Date().toISOString(),
                    descripcion: `Acción ${req.method} procesada exitosamente en ${req.originalUrl}`
                });
            }
        }
    }));
};

setupProxy('/predios', process.env.PREDIOS_SERVICE_URL, [validator.productorExists], true, 'JWT_SECRET_PREDIOS');
setupProxy('/cultivos', process.env.CULTIVOS_SERVICE_URL, [], true, 'JWT_SECRET_CULTIVOS');
setupProxy('/inspecciones', process.env.INSPECCIONES_SERVICE_URL, [validator.productorExists, validator.tecnicoExists], true, 'JWT_SECRET_INSPECCIONES');
setupProxy('/auditoria', process.env.AUDITORIA_SERVICE_URL, [restrictTo('admin')], true, 'JWT_SECRET_AUDITORIA');

module.exports = router;

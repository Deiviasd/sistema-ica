const { Router } = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const autenticacionControlador = require('../controladores/autenticacion.controlador');
const { authenticateToken, restrictTo } = require('../middlewares/autenticacion');
const { limitadorLogin, limitadorRegistro } = require('../middlewares/limitador');

const router = Router();

// Rutas orquestadas con Rate Limiting
router.post('/register', limitadorRegistro, autenticacionControlador.registrar);
router.get('/users/by-status', authenticateToken, restrictTo('admin'), autenticacionControlador.obtenerUsuariosPorEstado);

// Rate Limiting para login (antes del proxy)
router.post('/login', limitadorLogin);

// Proxy para las demás peticiones (/auth/login, etc.)
router.use('/', (req, res, next) => {
    const publicPaths = ['/login', '/catalogos'];
    const isPublic = publicPaths.some(path => req.path.startsWith(path));

    if (req.method === 'OPTIONS') return next();
    if (isPublic) return next();

    console.log(`📡 [GATEWAY] Recibida petición en ruta protegida de ms-auth: ${req.path}`);

    if (req.path.startsWith('/pending') || req.path.startsWith('/users')) {
        return authenticateToken(req, res, () => restrictTo('admin')(req, res, next));
    }

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

module.exports = router;

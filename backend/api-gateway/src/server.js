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
            id_lugar_produccion, nombre_lote, area, especie, variedad, fecha_siembra
        } = req.body;

        const loteResponse = await internalApi.predios.post('/lotes', {
            id_lugar_produccion, nombre_lote, area
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
// RUTA ORQUESTADA: Registro de Usuario + Predio Inicial
// RUTA ORQUESTADA: Registro de Usuario + Registro Legal de Productor (Lugar)
app.post('/auth/register', async (req, res, next) => {
    try {
        const {
            nombre, documento, email, password, id_rol,
            nombre_predio, // Se usará como Nombre de la Empresa/Lugar
            numero_predial, // Se usará como Registro de Productor
            departamento, municipio, vereda, direccion
        } = req.body;

        console.log(`🚀 [ORQUESTADOR] Iniciando registro integral para: ${email}`);

        // 1. Verificar si el email ya existe antes de crear nada (Atomicidad)
        try {
            const checkRes = await internalApi.auth.get(`check-email/${encodeURIComponent(email)}`, {
                headers: { 'x-internal-key': process.env.INTERNAL_API_KEY }
            });
            if (checkRes.data.exists) {
                return res.status(400).json({ error: 'Ya existe un usuario registrado con este correo electrónico' });
            }
        } catch (err) {
            console.warn('⚠️ [ORQUESTADOR] No se pudo verificar el email:', err.message || err);
        }

        let id_region = null;
        try {
            // 2. Crear la Región en ms-predios
            const regionRes = await internalApi.predios.post('/regiones', {
                departamento, municipio, vereda, direccion
            });
            id_region = regionRes.data.id_region;
            console.log(`📍 [ORQUESTADOR] Región creada con ID: ${id_region}`);
        } catch (err) {
            return res.status(500).json({ error: 'Error al registrar la ubicación geográfica' });
        }

        let id_usuario = null;
        try {
            // 3. Crear el Usuario en ms-auth pasando el id_region
            const authRes = await internalApi.auth.post('register', {
                nombre, documento, email, password, id_rol,
                id_region: id_region.toString()
            });

            const newUser = authRes.data;
            id_usuario = newUser.id;
            console.log(`👤 [ORQUESTADOR] Usuario creado con ID: ${id_usuario}`);
        } catch (err) {
            // 🔄 ROLLBACK: Si falla el usuario, borramos la región creada
            console.error('❌ [ORQUESTADOR] Falló creación de usuario, ejecutando rollback de región...');
            await internalApi.predios.delete(`/regiones/${id_region}`).catch(e => console.error('⚠️ Falló rollback de región:', e.message));

            // Extraer el mensaje real del error
            const errorMsg = err.response?.data?.error || err.message || "";
            const msg = errorMsg.includes('Usuario ya existe')
                ? 'Este correo ya está registrado'
                : (errorMsg || 'Error en el proceso de registro');

            return res.status(400).json({ error: msg });
        }

        // 4. Si es Productor, registrar su Lugar de Producción (Registro Legal)
        if (id_rol === 'PRODUCTOR') {
            try {
                console.log(`🏢 [ORQUESTADOR] Registrando Lugar de Producción para ID: ${id_usuario}`);

                await internalApi.predios.post('/lugares-produccion', {
                    nombre_lugar: nombre_predio || `Operación de ${nombre}`,
                    numero_registro: numero_predial || 'PENDIENTE',
                    productor_id: id_usuario,
                    id_region: id_region
                }, {
                    headers: {
                        'x-user-id': id_usuario,
                        'x-user-role': id_rol
                    }
                });
            } catch (err) {
                console.error('⚠️ [ORQUESTADOR] Error al registrar Lugar de Producción:', err.message);
            }
        }

        res.status(201).json({
            success: true,
            message: 'Registro exitoso. Ahora puedes iniciar sesión.',
            user: { id: id_usuario, email }
        });

    } catch (error) {
        console.error('❌ [ORQUESTADOR] Error crítico en registro:', error.message);
        res.status(error.status || 500).json({
            error: error.message || 'Error inesperado en el servidor'
        });
    }
});

// Obtener usuarios con hidratación de datos (Región + Lugar de Producción)
app.get('/auth/users/by-status', authenticateToken, restrictTo('admin'), async (req, res) => {
    try {
        const { status } = req.query;
        console.log(`🔍 [ORQUESTADOR] Hidratando usuarios con estado: ${status}`);

        // 1. Obtener los usuarios base de ms-auth
        const usersRes = await internalApi.auth.get(`users/by-status?status=${status}`);
        const baseUsers = usersRes.data;

        // 2. Hidratar cada usuario con datos de ms-predios
        const hydratedUsers = await Promise.all(baseUsers.map(async (user) => {
            const enrichedUser = {
                ...user,
                // Mapeo para compatibilidad con el frontend anterior
                id_usuario: user.id_usuario,
                correo: user.email || user.correo
            };

            // Traer Región si existe
            if (user.id_region) {
                try {
                    const regionRes = await internalApi.predios.get(`/regiones/${user.id_region}`);
                    enrichedUser.region = regionRes.data;
                } catch (e) {
                    console.warn(`⚠️ No se pudo cargar región para usuario ${user.id_usuario}`);
                }
            }

            // Traer Lugar de Producción si es PRODUCTOR
            if (user.id_rol === 'PRODUCTOR') {
                try {
                    const lugarRes = await internalApi.predios.get('/lugares-produccion', {
                        headers: {
                            'x-user-id': user.id_usuario,
                            'x-user-role': user.id_rol
                        }
                    });
                    // El frontend espera un array llamado usuario_predio
                    enrichedUser.usuario_predio = (lugarRes.data || []).map(l => ({
                        nombre_predio: l.nombre_lugar,
                        numero_predial: l.numero_registro
                    }));
                } catch (e) {
                    console.warn(`⚠️ No se pudo cargar lugar para usuario ${user.id_usuario}`);
                }
            }

            return enrichedUser;
        }));

        res.json(hydratedUsers);

    } catch (error) {
        console.error('❌ [ORQUESTADOR] Error hidatando usuarios:', error.message);
        res.status(500).json({ error: 'Error al obtener expediente completo de usuarios' });
    }
});

// Proxy para el resto de rutas de /auth
app.use('/auth', (req, res, next) => {
    const publicPaths = ['/login', '/catalogos']; // /register ya no es manejado aquí
    const isPublic = publicPaths.some(path => req.path.startsWith(path));

    if (isPublic) return next();

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

// 🚜 Microservicios de Negocio (Usan pathRewrite porque no esperan /predios o /cultivos internamente)
setupProxy('/predios', process.env.PREDIOS_SERVICE_URL, [validator.productorExists], true, 'JWT_SECRET_PREDIOS');
setupProxy('/cultivos', process.env.CULTIVOS_SERVICE_URL, [], true, 'JWT_SECRET_CULTIVOS');
setupProxy('/inspecciones', process.env.INSPECCIONES_SERVICE_URL, [validator.productorExists, validator.tecnicoExists], true, 'JWT_SECRET_INSPECCIONES');
setupProxy('/auditoria', process.env.AUDITORIA_SERVICE_URL, [restrictTo('admin')], true, 'JWT_SECRET_AUDITORIA');

// ==========================================
// 🚀 ENDPOINT COMBINADO: Dashboard del Productor
// Reduce 3 round-trips a 1 petición paralela
// ==========================================
app.get('/api/dashboard/resumen', authenticateToken, async (req, res) => {
    try {
        const userRole = req.user?.app_metadata?.role || req.user?.role;

        // Construir headers internos reutilizables
        const internalHeaders = { 'x-internal-key': process.env.INTERNAL_API_KEY };

        // Armar headers con token re-firmado para cada microservicio
        const prediosHeaders = internalApi.getAuthHeaders(req.user, 'JWT_SECRET_PREDIOS');
        const cultivosHeaders = internalApi.getAuthHeaders(req.user, 'JWT_SECRET_CULTIVOS');
        const inspeccionesHeaders = internalApi.getAuthHeaders(req.user, 'JWT_SECRET_INSPECCIONES');

        // Inyectar identidad del usuario en los headers internos
        const injectUserHeaders = (config) => ({
            ...config,
            headers: {
                ...config.headers,
                'x-internal-key': process.env.INTERNAL_API_KEY,
                'x-user-id': req.user?.id_usuario || req.user?.id,
                'x-user-role': userRole
            }
        });

        // 🚀 Las 3 llamadas en PARALELO
        const [prediosRes, siembrasRes, inspeccionesRes] = await Promise.allSettled([
            internalApi.predios.get('/list', injectUserHeaders(prediosHeaders)),
            internalApi.cultivo.get('/siembras', injectUserHeaders(cultivosHeaders)),
            internalApi.inspecciones.get('/reporte', injectUserHeaders(inspeccionesHeaders))
        ]);

        res.json({
            predios: prediosRes.status === 'fulfilled' ? prediosRes.value.data : [],
            siembras: siembrasRes.status === 'fulfilled' ? siembrasRes.value.data : [],
            inspecciones: inspeccionesRes.status === 'fulfilled' ? inspeccionesRes.value.data : []
        });

    } catch (error) {
        console.error('❌ [DASHBOARD] Error en endpoint combinado:', error.message);
        res.status(500).json({ error: 'Error al cargar datos del dashboard' });
    }
});

app.get('/health', (req, res) => res.json({ status: 'Orchestrator Online [Token Swapper Active]' }));


app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`📡 Orquestador ICA activo en puerto ${PORT} con soporte Multi-Cuenta`);
});
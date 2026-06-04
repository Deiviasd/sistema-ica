const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.split(' ')[1];

    if (req.method === "OPTIONS") return next();
    if (!token) return res.status(401).json({ error: "Token requerido" });

    try {
        const secret = (process.env.JWT_SECRET_AUTH || process.env.JWT_SECRET || "").trim();

        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
            try {
                const header = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString());
                console.log(`🔍 [JWT DEBUG] Header:`, JSON.stringify(header));
            } catch (e) { }
        }
        console.log(`🔍 [JWT DEBUG] Secret Length: ${secret.length}`);

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
        return res.status(401).json({ error: 'Sesión expirada o inválida', details: err.message });
    }
}

const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (req.method === 'OPTIONS') return next();

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

module.exports = {
    authenticateToken,
    restrictTo
};

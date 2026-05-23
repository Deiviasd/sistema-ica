// 🛡️ Middleware de Identidad Inyectada (Confiamos en el Gateway)
const authenticateInternal = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];

    if (!userId) {
        console.error('❌ Acceso directo denegado en MS-INSPECCIONES (Sin header de identidad)');
        return res.status(401).json({ error: 'Acceso solo permitido a través del API Gateway' });
    }

    req.user = { id_usuario: userId, role: userRole };
    next();
};

module.exports = { authenticateInternal };

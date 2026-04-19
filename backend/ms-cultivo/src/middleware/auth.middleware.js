// 🛡️ Middleware de Identidad Inyectada (Confiamos en el Gateway)
const verifyToken = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];

    if (!userId) {
        console.error('❌ Acceso directo denegado en MS-CULTIVO (Sin header de identidad)');
        return res.status(401).json({ error: 'Acceso solo permitido a través del API Gateway' });
    }

    // Adaptamos al formato que esperan los controladores (usando 'id' como nombre clave)
    req.user = { id: userId, role: userRole };
    next();
}

module.exports = { verifyToken }

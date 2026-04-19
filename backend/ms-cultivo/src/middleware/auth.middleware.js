const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];

    if (!userId) {
        console.error('❌ Acceso directo denegado en MS-CULTIVO (Sin header de identidad)');
        return res.status(401).json({ error: 'Acceso solo permitido a través del API Gateway' });
    }

    // Adaptamos al formato que esperan los controladores y servicios
    req.user = { 
        id: userId,
        id_usuario: userId,
        role: userRole
    };
    next();
}

module.exports = { verifyToken }

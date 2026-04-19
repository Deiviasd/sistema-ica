const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token requerido' });

    try {
        const secret = process.env.JWT_SECRET || "";
        const decoded = jwt.verify(token, secret);
        // Adaptamos al formato que esperan los controladores
        req.user = { 
            ...decoded,
            id: decoded.id_usuario // Compatibilidad con req.user.id
        };
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido o expirado' });
    }
}

module.exports = { verifyToken }

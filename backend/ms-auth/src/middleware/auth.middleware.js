const jwt = require('jsonwebtoken')

const verifyToken = (req, res, next) => {
    // 1️⃣ Obtener header Authorization
    const authHeader = req.headers.authorization

    if (!authHeader) {
        return res.status(401).json({ error: 'Token requerido' })
    }

    // 2️⃣ Extraer token (Bearer TOKEN)
    const token = authHeader.split(' ')[1]

    try {
        // 3️⃣ Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        req.user = decoded

        next() // Permitir acceso
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' })
    }
}

const requireAdmin = (req, res, next) => {
    // Se asume que el objeto req.user ya existe gracias a verifyToken
    const role = req.user?.app_metadata?.role

    if (role !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado: Se requieren privilegios de Administrador ICA' })
    }

    next()
}

module.exports = { verifyToken, requireAdmin }
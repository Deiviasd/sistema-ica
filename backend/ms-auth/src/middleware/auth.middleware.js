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

        // 4️⃣ Guardar usuario en request
        req.user = decoded

        next() // Permitir acceso
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' })
    }
}

module.exports = { verifyToken }
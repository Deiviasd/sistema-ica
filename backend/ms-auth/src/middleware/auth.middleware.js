const jwt = require('jsonwebtoken')
const { findUserById } = require('../repositories/user.repository')

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization
    if (!authHeader) return res.status(401).json({ error: 'Token requerido' })

    const token = authHeader.split(' ')[1]

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        
        // 🔒 VERIFICACIÓN DE ESTADO EN VIVO:
        // No basta con que el token sea válido, el usuario debe estar ACTIVO en DB
        const user = await findUserById(decoded.id_usuario || decoded.sub)
        
        if (!user || user.estado !== 'activo') {
            return res.status(403).json({ 
                error: 'CUENTA_BLOQUEADA',
                message: 'Tu cuenta ha sido deshabilitada por un administrador del ICA.' 
            })
        }

        req.user = decoded
        next()
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' })
    }
}

const requireAdmin = (req, res, next) => {
    // Se asume que el objeto req.user ya existe
    const role = req.user?.app_metadata?.role;
    console.log("👀 [MS-AUTH] JWT Analizado en requireAdmin:", JSON.stringify(req.user));
    
    if (role !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado: Se requieren privilegios de Administrador ICA' })
    }

    next()
}

module.exports = { verifyToken, requireAdmin }
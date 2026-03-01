const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const { createProxyMiddleware } = require('http-proxy-middleware')

const app = express()

app.use(cors())

// 🔐 Middleware de autenticación
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({ error: 'Token requerido' })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded
        next()
    } catch (err) {
        return res.status(403).json({ error: 'Token inválido' })
    }
}

// 🔁 Proxy a MS-AUTH (sin validación)
app.use('/auth', createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/auth': '' },
    onProxyReq: (proxyReq, req, res) => {
        if (req.body) {
            const bodyData = JSON.stringify(req.body)
            proxyReq.setHeader('Content-Type', 'application/json')
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData))
            proxyReq.write(bodyData)
        }
    }
}))

// 🔁 Proxy a MS-USERS (con validación previa)
app.use('/users',
    authenticateToken,
    createProxyMiddleware({
        target: process.env.USERS_SERVICE_URL,
        changeOrigin: true,
        logLevel: 'debug',
        onProxyReq: (proxyReq, req, res) => {
            console.log('➡️ Enviando a:', req.method, req.originalUrl)
        }
    })
)

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
    console.log(`API Gateway corriendo en puerto ${PORT}`)
})
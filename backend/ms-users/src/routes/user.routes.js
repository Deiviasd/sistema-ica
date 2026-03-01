const express = require('express')
const router = express.Router()
const { verifyToken } = require('../middleware/auth.middleware')

// Perfil protegido
router.get('/profile', verifyToken, (req, res) => {
    res.json({
        message: 'Perfil protegido 👤',
        user: req.user
    })
})

// Lista protegida (la que usa el dashboard)
router.get('/', verifyToken, (req, res) => {
    res.json([
        { email: "test1@test.com" },
        { email: "test2@test.com" },
        { email: "test3@test.com" }
    ])
})

module.exports = router
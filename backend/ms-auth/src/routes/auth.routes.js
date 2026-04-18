const express = require('express')
const router = express.Router()

const { 
    loginController, 
    registerController, 
    getPendingController, 
    updateStatusController 
} = require('../controllers/auth.controller')
const { verifyToken } = require('../middleware/auth.middleware')

router.get('/profile', verifyToken, (req, res) => {
    res.json({
        message: 'Ruta protegida 🔐',
        user: req.user
    })
})
router.post('/register', registerController)
router.post('/login', loginController)

// 👨‍💼 Gestión de Usuarios (Sólo Admins - validado por Gateway)
router.get('/users/pending', verifyToken, getPendingController)
router.patch('/users/:id/status', verifyToken, updateStatusController)

module.exports = router
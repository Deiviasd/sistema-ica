const express = require('express')
const router = express.Router()

const { 
    loginController, 
    registerController, 
    getPendingController, 
    updateStatusController,
    getUserController 
} = require('../controllers/auth.controller')
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware')

router.get('/profile', verifyToken, (req, res) => {
    res.json({
        message: 'Ruta protegida 🔐',
        user: req.user
    })
})
router.post('/register', registerController)
router.post('/login', loginController)

// 👨‍💼 Gestión de Usuarios (Sólo Admins - validado por Gateway y Middleware Interno)
router.get('/usuarios/:id', getUserController) // <--- Esta es la que usa el Validator
router.get('/users/pending', verifyToken, requireAdmin, getPendingController)
router.patch('/users/:id/status', verifyToken, requireAdmin, updateStatusController)

module.exports = router
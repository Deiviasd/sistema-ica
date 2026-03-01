const express = require('express')
const router = express.Router()

const { loginController, registerController } = require('../controllers/auth.controller')
const { verifyToken } = require('../middleware/auth.middleware')

router.get('/profile', verifyToken, (req, res) => {
    res.json({
        message: 'Ruta protegida 🔐',
        user: req.user
    })
})
router.post('/register', registerController)
router.post('/login', loginController)

module.exports = router
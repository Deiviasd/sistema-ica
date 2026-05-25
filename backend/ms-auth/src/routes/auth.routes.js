const express = require('express')
const router = express.Router()

const { 
    loginController, 
    registerController, 
    getUsersByStatusController, 
    getAllController,
    updateStatusController,
    deleteController,
    getUserController,
    getUsersByRoleController,
    getProfileController,
    checkEmailController,
    updateProfileController
} = require('../controllers/auth.controller')
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware')

router.get('/profile', verifyToken, getProfileController)
router.patch('/profile', verifyToken, updateProfileController)
router.get('/check-email/:email', checkEmailController)
router.post('/register', registerController)
router.post('/login', loginController)

// 👨‍💼 Gestión de Usuarios (Sólo Admins - validado por Gateway y Middleware Interno)
router.get('/usuarios/:id', getUserController)
router.get('/usuarios/rol/:role', getUsersByRoleController)
router.get('/users/by-status', verifyToken, requireAdmin, getUsersByStatusController)
router.get('/users/all', verifyToken, requireAdmin, getAllController)
router.patch('/users/:id/status', verifyToken, requireAdmin, updateStatusController)
router.delete('/users/:id', verifyToken, requireAdmin, deleteController)

module.exports = router
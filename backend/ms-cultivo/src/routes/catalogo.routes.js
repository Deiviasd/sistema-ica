const express = require('express')
const router = express.Router()
const { getEspecies, getVariedades } = require('../controllers/catalogo.controller')
const authenticateToken = require('../middleware/auth.middleware')

// Protegemos las rutas para asegurar que solo usuarios autenticados consulten catálogos
router.get('/especies', authenticateToken, getEspecies)
router.get('/variedades', authenticateToken, getVariedades)

module.exports = router

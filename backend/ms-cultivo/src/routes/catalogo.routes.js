const express = require('express')
const router = express.Router()
const { getEspecies, getVariedades } = require('../controllers/catalogo.controller')
const { verifyToken } = require('../middleware/auth.middleware')

// Protegemos las rutas para asegurar que solo usuarios autenticados consulten catálogos
router.get('/especies', verifyToken, getEspecies)
router.get('/variedades', verifyToken, getVariedades)

module.exports = router

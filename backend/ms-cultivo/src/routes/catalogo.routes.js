const express = require('express')
const router = express.Router()
const { getEspecies, addEspecie, getVariedades, addVariedad } = require('../controllers/catalogo.controller')
const { verifyToken } = require('../middleware/auth.middleware')

// Consultas
router.get('/especies', verifyToken, getEspecies)
router.get('/variedades', verifyToken, getVariedades)

// Creación manual
router.post('/especies', verifyToken, addEspecie)
router.post('/variedades', verifyToken, addVariedad)

module.exports = router

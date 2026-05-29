const express = require('express')
const router = express.Router()
const { getEspecies, addEspecie, getVariedades, addVariedad, patchEspecie, removeEspecie, patchVariedad, removeVariedad } = require('../controllers/catalogo.controller')
const { verifyToken } = require('../middleware/auth.middleware')

// Consultas
router.get('/especies', verifyToken, getEspecies)
router.get('/variedades', verifyToken, getVariedades)

// Creación manual
router.post('/especies', verifyToken, addEspecie)
router.post('/variedades', verifyToken, addVariedad)
router.patch('/especies/:id', verifyToken, patchEspecie)
router.delete('/especies/:id', verifyToken, removeEspecie)
router.patch('/variedades/:id', verifyToken, patchVariedad)
router.delete('/variedades/:id', verifyToken, removeVariedad)

module.exports = router

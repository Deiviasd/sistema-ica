const express = require('express')
const router = express.Router()
const { getAllPlagas, registerManualPlaga } = require('../controllers/plaga.controller')
const { verifyToken } = require('../middleware/auth.middleware')

// Ruta para obtener plagas (opcionalmente filtrado por id_especie)
router.get('/', verifyToken, getAllPlagas)

// Ruta para registrar una plaga manual y vincularla a una especie
router.post('/manual', verifyToken, registerManualPlaga)

module.exports = router

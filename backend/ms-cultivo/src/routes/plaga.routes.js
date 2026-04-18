const express = require('express')
const router = express.Router()
const { getAllPlagas } = require('../controllers/plaga.controller')
const authenticateToken = require('../middleware/auth.middleware')

// Ruta para obtener plagas (opcionalmente filtrado por id_especie)
router.get('/', authenticateToken, getAllPlagas)

module.exports = router

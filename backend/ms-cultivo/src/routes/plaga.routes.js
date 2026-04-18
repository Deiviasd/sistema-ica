const express = require('express')
const router = express.Router()
const { getAllPlagas } = require('../controllers/plaga.controller')
const { verifyToken } = require('../middleware/auth.middleware')

// Ruta para obtener plagas (opcionalmente filtrado por id_especie)
router.get('/', verifyToken, getAllPlagas)

module.exports = router

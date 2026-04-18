const express = require('express')
const router = express.Router()
const { createSiembraController, getSiembrasController } = require('../controllers/siembra.controller')
const { verifyToken } = require('../middleware/auth.middleware')

router.post('/', verifyToken, createSiembraController)
router.get('/', verifyToken, getSiembrasController)
router.patch('/:id/finalizar', verifyToken, finishSiembraController)

module.exports = router

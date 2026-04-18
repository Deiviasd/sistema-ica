const express = require('express')
const router = express.Router()
const { createSiembraController, getSiembrasController, finishSiembraController } = require('../controllers/siembra.controller')
const { verifyToken } = require('../middleware/auth.middleware')

router.post('/', verifyToken, createSiembraController)
router.get('/', verifyToken, getSiembrasController)
router.patch('/:id/finalizar', verifyToken, finishSiembraController)

module.exports = router

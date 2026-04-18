const express = require('express');
const router = express.Router();
const catalogoController = require('../controllers/catalogo.controller');

// Rutas Públicas de Catálogo (Útiles para el formulario de registro)
router.get('/roles', catalogoController.fetchRoles);
router.get('/regiones', catalogoController.fetchRegiones);

module.exports = router;

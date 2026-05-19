const express = require('express');
const router = express.Router();
const predioController = require('../controllers/predioController');

// Middleware de Identidad Inyectada (Confiamos en el Gateway)
const authenticateInternal = (req, res, next) => {
    const internalKey = req.headers['x-internal-key'];
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];
    
    // 🔑 Validar llave maestra o presencia de usuario inyectado
    if (internalKey !== process.env.INTERNAL_API_KEY && !userId) {
        return res.status(401).json({ error: 'Acceso denegado: Comunicación interna no autorizada' });
    }

    req.user = { id_usuario: userId, role: userRole };
    next();
};

router.get('/lugares-produccion', authenticateInternal, predioController.getLugares);
router.get('/list', authenticateInternal, predioController.getPredios);
router.post('/lugares-produccion', authenticateInternal, predioController.postLugar);
router.post('/predios', authenticateInternal, predioController.postPredio);
router.post('/lotes', authenticateInternal, predioController.postLote);
router.get('/regiones', authenticateInternal, predioController.listRegiones);
router.get('/regiones/:id', authenticateInternal, predioController.getRegion);
router.post('/regiones', predioController.postRegion); 
router.delete('/regiones/:id', predioController.deleteRegion); // Para rollback
router.delete('/lotes/:id', authenticateInternal, predioController.deleteLote);
router.delete('/predios/:id', authenticateInternal, predioController.deletePredio);

module.exports = router;

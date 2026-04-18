const catalogos = require('../repositories/catalogo.repository');

const fetchRoles = async (req, res) => {
    try {
        const roles = await catalogos.getRoles();
        res.json(roles);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener roles', details: error.message });
    }
};

const fetchRegiones = async (req, res) => {
    try {
        const regiones = await catalogos.getRegiones();
        res.json(regiones);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener regiones', details: error.message });
    }
};

module.exports = { fetchRoles, fetchRegiones };

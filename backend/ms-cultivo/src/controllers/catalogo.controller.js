const { listEspecies, listVariedadesByEspecie } = require('../repositories/catalogo.repository')

const getEspecies = async (req, res) => {
    try {
        const especies = await listEspecies();
        res.json(especies);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener especies', details: error.message });
    }
}

const getVariedades = async (req, res) => {
    try {
        const { id_especie } = req.query;
        if (!id_especie) {
            return res.status(400).json({ error: 'Se requiere id_especie para consultar variedades' });
        }
        
        const variedades = await listVariedadesByEspecie(id_especie);
        res.json(variedades);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener variedades', details: error.message });
    }
}

module.exports = { getEspecies, getVariedades }

const { getPlagasByEspecie, listAllPlagas } = require('../repositories/plaga.repository')

const getAllPlagas = async (req, res) => {
    try {
        const { id_especie } = req.query;
        let plagas;

        if (id_especie) {
            plagas = await getPlagasByEspecie(id_especie);
        } else {
            plagas = await listAllPlagas();
        }

        res.json(plagas);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener plagas', details: error.message });
    }
}

module.exports = { getAllPlagas }

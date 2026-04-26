const { getPlagasByEspecie, listAllPlagas, upsertPlaga } = require('../repositories/plaga.repository')

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

const registerManualPlaga = async (req, res) => {
    try {
        const { nombre, id_especie } = req.body;
        if (!nombre || !id_especie) {
            return res.status(400).json({ error: 'Nombre e id_especie son obligatorios' });
        }

        const idPlaga = await upsertPlaga(nombre, id_especie);
        res.status(201).json({ id_plaga: idPlaga, message: 'Plaga registrada/vinculada correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar plaga manual', details: error.message });
    }
}

module.exports = { getAllPlagas, registerManualPlaga }

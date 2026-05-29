const { 
    listEspecies, 
    listVariedadesByEspecie,
    createEspecie,
    createVariedad,
    updateEspecie,
    deleteEspecie,
    updateVariedad,
    deleteVariedad
} = require('../repositories/catalogo.repository')

const getEspecies = async (req, res) => {
    try {
        const especies = await listEspecies();
        res.json(especies);
    } catch (error) {
        console.error('[CATALOGO CONTROLLER] getEspecies:', error);
        res.status(500).json({ error: 'Error al obtener especies', details: error.message });
    }
}

const addEspecie = async (req, res) => {
    try {
        const { nombre_comun, ciclo } = req.body;
        if (!nombre_comun) return res.status(400).json({ error: 'Nombre común requerido' });
        if (!ciclo) return res.status(400).json({ error: 'Ciclo requerido (corto, mediano, largo)' });
        
        const data = await createEspecie(nombre_comun, ciclo);
        res.status(201).json(data);
    } catch (error) {
        console.error('[CATALOGO CONTROLLER] addEspecie:', error);
        res.status(500).json({ error: 'Error al crear especie', details: error.message });
    }
}

const getVariedades = async (req, res) => {
    try {
        const { id_especie } = req.query;
        const variedades = await listVariedadesByEspecie(id_especie);
        res.json(variedades);
    } catch (error) {
        console.error('[CATALOGO CONTROLLER] getVariedades:', error);
        res.status(500).json({ error: 'Error al obtener variedades', details: error.message });
    }
}

const addVariedad = async (req, res) => {
    try {
        const { id_especie, nombre_variedad } = req.body;
        if (!id_especie || !nombre_variedad) {
            return res.status(400).json({ error: 'id_especie y nombre_variedad requeridos' });
        }
        
        const data = await createVariedad(id_especie, nombre_variedad);
        res.status(201).json(data);
    } catch (error) {
        console.error('[CATALOGO CONTROLLER] addVariedad:', error);
        res.status(500).json({ error: 'Error al crear variedad', details: error.message });
    }
}

const patchEspecie = async (req, res) => {
    try {
        const data = await updateEspecie(req.params.id, req.body)
        res.json(data)
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const removeEspecie = async (req, res) => {
    try {
        const data = await deleteEspecie(req.params.id)
        res.json(data)
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const patchVariedad = async (req, res) => {
    try {
        const data = await updateVariedad(req.params.id, req.body)
        res.json(data)
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const removeVariedad = async (req, res) => {
    try {
        const data = await deleteVariedad(req.params.id)
        res.json(data)
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

module.exports = { getEspecies, addEspecie, getVariedades, addVariedad, patchEspecie, removeEspecie, patchVariedad, removeVariedad }

const express = require('express');
const cors = require('cors');
const { supabase } = require('./src/config/supabase');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4001;

// --- GESTIÓN DE LUGARES DE PRODUCCIÓN ---
app.get('/lugares-produccion', async (req, res) => {
    try {
        const { productor_id } = req.query;
        let query = supabase.from('lugar_produccion').select('*, lote(*)');
        
        if (productor_id) query = query.eq('productor_id', productor_id);

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/lugares-produccion', async (req, res) => {
    try {
        const { nombre_lugar, area_total, numero_predial, productor_id } = req.body;
        const { data, error } = await supabase
            .from('lugar_produccion')
            .insert([{ nombre_lugar, area_total, numero_predial, productor_id }])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- GESTIÓN DE LOTES ---
app.post('/lotes', async (req, res) => {
    try {
        const { nombre_lote, area, id_lugar_produccion } = req.body;
        const { data, error } = await supabase
            .from('lote')
            .insert([{ nombre_lote, area, id_lugar_produccion, estado: 'disponible' }])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/lotes/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const { data, error } = await supabase
            .from('lote')
            .update({ estado })
            .eq('id_lote', id)
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ MS-Predios corriendo en puerto ${PORT}`);
});

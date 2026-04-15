const express = require('express');
const cors = require('cors');
const { supabase } = require('./src/config/supabase');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4001;

// --- GESTIÓN DE LUGARES DE PRODUCCIÓN ---
// Paso 1 y 2: Listar lugares del predio (Productor)
app.get('/lugares-produccion', async (req, res) => {
    try {
        const { productor_id, id } = req.query;
        let query = supabase.from('lugar_produccion').select('*, lote(*)');
        
        if (id) {
            query = query.eq('id_lugar_produccion', id);
        } else if (productor_id) {
            query = query.eq('productor_id', productor_id);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Paso 4, 5 y 6: Registrar nuevo lugar (Nombre y Área en m2)
app.post('/lugares-produccion', async (req, res) => {
    try {
        const { nombre_lugar, area_total_m2, numero_predial, productor_id } = req.body;
        
        // El Paso 6 de la secuencia pide validar campos obligatorios
        if (!nombre_lugar || !area_total_m2 || !productor_id || !numero_predial) {
            return res.status(400).json({ error: 'Todos los campos (Nombre, Área m², ID Productor y Número Predial) son obligatorios.' });
        }

        // Paso 7: Registrar y asociar
        const { data, error } = await supabase
            .from('lugar_produccion')
            .insert([{ 
                nombre_lugar, 
                area_total: area_total_m2, // Guardamos los m2
                numero_predial, 
                productor_id 
            }])
            .select();

        if (error) {
            if (error.code === '23505') return res.status(400).json({ error: 'Este Número Predial ya está registrado.' });
            throw error;
        }

        // Paso 8: Confirmación de éxito
        res.status(201).json({
            message: 'Lugar de producción registrado exitosamente y asociado al predio legal.',
            data: data[0]
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- GESTIÓN DE LOTES ---
app.post('/lotes', async (req, res) => {
    try {
        const { nombre_lote, area_m2, id_lugar_produccion } = req.body;
        const { data, error } = await supabase
            .from('lote')
            .insert([{ 
                nombre_lote, 
                area: area_m2, 
                id_lugar_produccion, 
                estado: 'disponible' 
            }])
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
        const { data, error } = await supabase.from('lote').update({ estado }).eq('id_lote', id).select();
        if (error) throw error;
        res.json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ MS-Predios (Alineado con Wizard Productor) en el puerto ${PORT}`);
});

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js'); // Usamos createClient directo
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4001;
const SUPABASE_URL = process.env.SUPABASE_URL;
// 🔹 Fallback a SERVICE_ROLE si no hay ANON_KEY definida
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// 🛡️ HELPER: Crear cliente de Supabase con la identidad del usuario
const getSupabaseUserClient = (req) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    // Si no hay token, el RLS fallará automáticamente (lo cual es bueno)
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });
};

// --- GESTIÓN DE LUGARES DE PRODUCCIÓN ---
// Paso 1 y 2: Listar lugares del predio (Delegado a Supabase RLS)
app.get('/lugares-produccion', async (req, res) => {
    try {
        const supabase = getSupabaseUserClient(req);
        const { id } = req.query;
        
        let query = supabase.from('lugar_produccion').select('*, lote(*)');
        
        if (id) {
            query = query.eq('id_lugar_produccion', id);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        // Si no hay data por RLS, devolverá [] vacío (correcto)
        res.json(data);
    } catch (error) {
        console.error('❌ Error de Supabase en MS-PREDIOS:', error);
        res.status(401).json({ 
            error: 'Sesión inválida o acceso denegado por RLS', 
            details: error.message || error 
        });
    }
});

// Paso 4, 5 y 6: Registrar nuevo lugar (Identidad automática vía RLS)
app.post('/lugares-produccion', async (req, res) => {
    try {
        const supabase = getSupabaseUserClient(req);
        const { nombre_lugar, area_total_m2, numero_predial, productor_id } = req.body;
        
        // El RLS verificará que el 'productor_id' que envíes coincida con tu Token
        const { data, error } = await supabase
            .from('lugar_produccion')
            .insert([{ 
                nombre_lugar, 
                area_total: area_total_m2, 
                numero_predial, 
                productor_id 
            }])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (error) {
        res.status(403).json({ error: 'No tienes permiso para registrar este predio o sesión expirada' });
    }
});

// --- GESTIÓN DE LOTES (Protegido por cascada RLS en Supabase) ---
app.post('/lotes', async (req, res) => {
    try {
        const supabase = getSupabaseUserClient(req);
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
        res.status(403).json({ error: 'No puedes crear lotes en lugares que no te pertenecen' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ MS-Predios: Seguridad delegada a Supabase RLS en puerto ${PORT}`);
});

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

// 🛡️ HELPER: Crear cliente de Supabase con Bypass de RLS (usando Service Role)
const getSupabaseAdmin = () => {
    return createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
};

// 🛡️ Middleware de Identidad Inyectada (Confiamos en el Gateway)
const authenticateInternal = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];
    
    if (!userId) {
        console.error('❌ Acceso directo denegado en MS-PREDIOS (Sin header de identidad)');
        return res.status(401).json({ error: 'Acceso solo permitido a través del API Gateway' });
    }

    req.user = { id_usuario: userId, role: userRole };
    next();
};

// --- GESTIÓN DE LUGARES DE PRODUCCIÓN ---
app.get('/lugares-produccion', authenticateInternal, async (req, res) => {
    try {
        const supabase = getSupabaseAdmin();
        const { id_usuario, role } = req.user;
        
        console.log(`🔍 [MS-PREDIOS] Consultando para: ${id_usuario} | Rol: ${role}`);

        let query = supabase.from('lugar_produccion').select('*, lote(*)');

        // 🛡️ SEGURIDAD INTERNA: Convertimos a número para asegurar coincidencia con int4 en DB
        if (role !== 'ADMIN_ICA' && role !== 'admin') {
            const numericId = Number(id_usuario);
            console.log(`🎯 [MS-PREDIOS] Filtrando con ID NUMÉRICO: ${numericId}`);
            query = query.eq('productor_id', numericId);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        res.json(data || []);
    } catch (error) {
        console.error('❌ Error en MS-PREDIOS:', error.message);
        res.status(500).json({ error: 'Error interno', details: error.message });
    }
});

// Paso 4, 5 y 6: Registrar nuevo lugar (Identidad automática vía RLS)
app.post('/lugares-produccion', async (req, res) => {
    try {
        const supabase = getSupabaseUserClient(req);
        const { nombre_lugar, area_total_m2, numero_predial, productor_id, updated_at } = req.body;
        
        // El RLS verificará que el 'productor_id' que envíes coincida con tu Token
        const { data, error } = await supabase
            .from('lugar_produccion')
            .insert([{ 
                nombre_lugar, 
                area_total: area_total_m2, 
                numero_predial, 
                productor_id,
                updated_at: updated_at || new Date().toISOString()
            }])
            .select();

        if (error) {
            console.error('❌ Error detallado en INSERT ms-predios:', error);
            throw error;
        }
        res.status(201).json(data[0]);
    } catch (error) {
        res.status(403).json({ 
            error: 'Acceso denegado por RLS o validación de Supabase',
            message: error.message || error,
            code: error.code
        });
    }
});

// --- GESTIÓN DE LOTES (Protegido por cascada RLS en Supabase) ---
app.post('/lotes', async (req, res) => {
    console.log('📥 PETICIÓN RECIBIDA EN /LOTES:', req.body);
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

        if (error) {
            console.error('❌ Error en Lote:', error);
            return res.status(error.code === '42501' ? 403 : 500).json({ 
                error: error.message,
                code: error.code 
            });
        }
        res.status(201).json(data[0]);
    } catch (error) {
        console.error('🔥 Error crítico en Lote:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ MS-Predios: Seguridad delegada a Supabase RLS en puerto ${PORT}`);
});

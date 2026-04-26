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

const jwt = require('jsonwebtoken');

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

        const userRole = role?.toLowerCase();
        const producerId = Number(id_usuario);

        // LÓGICA DE PRIVACIDAD:
        // 1. Administradores y Técnicos ven todo (para poder gestionar agendamientos).
        // 2. Productores solo ven lo suyo.
        if (userRole === 'productor') {
            console.log(`🔐 Privacidad Activa (Productor): Filtrando por ID ${producerId}`);
            query = query.eq('productor_id', producerId);
        } else {
            console.log(`🔓 Acceso de Gestión (Rol: ${userRole}): Viendo todos los predios`);
        }

        const { data, error } = await query;
        if (error) {
            console.error('❌ Error Supabase /lugares-produccion:', error);
            throw error;
        }
        
        console.log(`✅ [MS-PREDIOS] Se encontraron ${data?.length || 0} lugares.`);
        res.json(data || []);
    } catch (error) {
        console.error('❌ Error en MS-PREDIOS:', error.message);
        res.status(500).json({ error: 'Error interno', details: error.message });
    }
});

// Registrar nuevo lugar
app.post('/lugares-produccion', authenticateInternal, async (req, res) => {
    try {
        const supabase = getSupabaseAdmin();
        const { nombre_lugar, area_total_m2, numero_predial } = req.body;
        const productor_id = req.user.id_usuario;
        
        const { data, error } = await supabase
            .from('lugar_produccion')
            .insert([{ 
                nombre_lugar, 
                area_total: area_total_m2, 
                numero_predial, 
                productor_id,
                updated_at: new Date().toISOString()
            }])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (error) {
        res.status(403).json({ error: error.message });
    }
});

// Editar nombre de lugar de producción
app.put('/lugares-produccion/:id', authenticateInternal, async (req, res) => {
    try {
        const supabase = getSupabaseAdmin();
        const { id } = req.params;
        const { nombre_lugar } = req.body;
        const productor_id = req.user.id_usuario;

        const { data, error } = await supabase
            .from('lugar_produccion')
            .update({ nombre_lugar, updated_at: new Date().toISOString() })
            .eq('id_lugar_produccion', id)
            .eq('productor_id', productor_id) // Seguridad: Solo el dueño edita
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Eliminar lugar de producción
app.delete('/lugares-produccion/:id', authenticateInternal, async (req, res) => {
    try {
        const supabase = getSupabaseAdmin();
        const { id } = req.params;
        const productor_id = req.user.id_usuario;

        const { error } = await supabase
            .from('lugar_produccion')
            .delete()
            .eq('id_lugar_produccion', id)
            .eq('productor_id', productor_id); // Seguridad: Solo el dueño elimina

        if (error) throw error;
        res.json({ message: 'Lugar eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Registrar nuevo lote
app.post('/lotes', authenticateInternal, async (req, res) => {
    try {
        const supabase = getSupabaseAdmin();
        const { nombre_lote, area_m2, id_lugar_produccion } = req.body;
        
        const { data, error } = await supabase
            .from('lote')
            .insert([{ 
                nombre_lote: nombre_lote, 
                area: area_m2, // Usando el nombre de columna correcto 'area'
                id_lugar_produccion: id_lugar_produccion,
                estado: 'disponible'
            }])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const amqp = require('amqplib');
const RABBIT_URL = process.env.RABBIT_URL || 'amqp://guest:guest@rabbitmq:5672';

async function startConsumer() {
    try {
        const connection = await amqp.connect(RABBIT_URL);
        const channel = await connection.createChannel();
        const queue = 'inspecciones_queue'; 

        await channel.assertQueue(queue, { durable: true });
        console.log(`📡 [MS-PREDIOS]: Sincronizado con Lotes en [${queue}]...`);

        channel.consume(queue, async (msg) => {
            if (msg !== null) {
                const event = JSON.parse(msg.content.toString());
                
                if (event.tipo === 'SIEMBRA_FINALIZADA') {
                    console.log(`🌿 [MS-PREDIOS]: Desactivando lote ${event.id_lote} por fin de siembra...`);
                    const supabase = getSupabaseAdmin();
                    await supabase
                        .from('lote')
                        .update({ estado: 'inactivo' })
                        .eq('id_lote', event.id_lote);
                }
                channel.ack(msg);
            }
        });
    } catch (error) {
        setTimeout(startConsumer, 5000);
    }
}
startConsumer();

app.listen(PORT, () => {
    console.log(`✅ MS-Predios: Escuchando ICA en puerto ${PORT}`);
});

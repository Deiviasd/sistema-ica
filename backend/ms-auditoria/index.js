const express = require('express');
const amqp = require('amqplib');
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 4004;
const RABBIT_URL = process.env.RABBIT_URL || 'amqp://guest:guest@rabbitmq:5672';

const isMissingAuditTable = (error) => {
    return error?.code === 'PGRST205' || error?.message?.includes("auditoria_logs");
};

// 📡 CONFIGURACIÓN DE BASE DE DATOS (Supabase Cloud)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        realtime: {
            transport: WebSocket
        }
    }
);

// 👂 CONSUMIDOR DE RABBITMQ
async function startConsumer() {
    try {
        const connection = await amqp.connect(RABBIT_URL);
        const channel = await connection.createChannel();
        const queue = 'audit_queue';

        await channel.assertQueue(queue, { durable: true });
        console.log(`📡 [MS-AUDITORIA]: Escuchando eventos ICA en [${queue}]...`);

        channel.consume(queue, async (msg) => {
            if (msg !== null) {
                const auditData = JSON.parse(msg.content.toString());
                console.log('📝 [MS-AUDITORIA]: Procesando evento:', auditData.tipo_accion);

                try {
                    const { error: dbError } = await supabase
                        .from('auditoria_logs') // Usando el nuevo nombre de tabla
                        .insert([{
                            id_usuario: auditData.id_usuario,
                            nombre_usuario: auditData.nombre_usuario || 'Sistema',
                            correo: auditData.correo || 'sistema@ica.gov.co',
                            rol: auditData.rol || 'SISTEMA',
                            tipo_accion: auditData.tipo_accion,
                            modulo: auditData.modulo || 'GENERAL',
                            descripcion: auditData.descripcion || auditData.mensaje || 'Acción registrada',
                            ip: auditData.ip || '0.0.0.0',
                            fecha_hora: auditData.timestamp || new Date().toISOString()
                        }]);

                    if (dbError) throw dbError;
                    
                    console.log('✅ [MS-AUDITORIA]: Evento guardado con éxito en Supabase.');
                    channel.ack(msg);
                } catch (dbError) {
                    console.error('❌ [MS-AUDITORIA]: Error guardando en Supabase:', dbError.message);
                }
            }
        });
    } catch (error) {
        console.error('❌ [MS-AUDITORIA]: Error en el bus de eventos:', error.message);
        setTimeout(startConsumer, 5000);
    }
}

// Iniciar consumidor
startConsumer();

// 🔍 ENDPOINT: CONSULTAR LOGS DE AUDITORÍA
app.get('/logs', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            tipo_accion, 
            id_usuario, 
            fecha_inicio, 
            fecha_fin,
            rol,
            search
        } = req.query;

        const from = (page - 1) * limit;
        const to = from + parseInt(limit) - 1;

        let query = supabase
            .from('auditoria_logs')
            .select('*', { count: 'exact' })
            .order('fecha_hora', { ascending: false })
            .range(from, to);

        // Filtros opcionales
        if (tipo_accion) query = query.eq('tipo_accion', tipo_accion);
        if (id_usuario) query = query.eq('id_usuario', id_usuario);
        if (rol) query = query.eq('rol', rol);
        
        if (fecha_inicio) query = query.gte('fecha_hora', fecha_inicio);
        if (fecha_fin) query = query.lte('fecha_hora', fecha_fin);

        // Búsqueda por nombre de usuario o tipo de acción
        if (search) {
            query = query.or(`nombre_usuario.ilike.%${search}%,tipo_accion.ilike.%${search}%,modulo.ilike.%${search}%`);
        }

        const { data, count, error } = await query;

        if (error) throw error;

        res.json({
            logs: data,
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit)
        });

    } catch (error) {
        console.error('❌ [MS-AUDITORIA]: Error al consultar logs:', error.message);
        if (isMissingAuditTable(error)) {
            return res.json({
                logs: [],
                total: 0,
                page: 1,
                limit: 20,
                pages: 0,
                setup_required: true,
                warning: 'La tabla public.auditoria_logs no existe en Supabase. Ejecuta backend/ms-auditoria/schema.sql.'
            });
        }
        res.status(500).json({ error: 'Error al obtener los logs de auditoría' });
    }
});

// Health check para el Orquestador
app.get('/health', async (req, res) => {
    try {
        const { data, error } = await supabase.from('auditoria_logs').select('fecha_hora').limit(1);
        if (error) throw error;
        res.json({
            status: 'Auditoría Activa',
            db_connected: true,
            sync_time: new Date()
        });
    } catch (e) {
        if (isMissingAuditTable(e)) {
            return res.status(200).json({
                status: 'Auditoría requiere configuración',
                db_connected: true,
                setup_required: true,
                message: 'La tabla public.auditoria_logs no existe en Supabase. Ejecuta backend/ms-auditoria/schema.sql.'
            });
        }
        res.status(500).json({ status: 'Error', db_connected: false, message: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 MS-Auditoría iniciado en puerto ${PORT}`);
});


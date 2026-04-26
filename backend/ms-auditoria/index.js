const express = require('express');
const amqp = require('amqplib');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4004;
const RABBIT_URL = process.env.RABBIT_URL || 'amqp://guest:guest@rabbitmq:5672';

// 📡 CONFIGURACIÓN DE BASE DE DATOS (Supabase Cloud)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
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
                        .from('auditoria')
                        .insert([{
                            modulo: auditData.modulo || 'SISTEMA',
                            tipo_accion: auditData.tipo_accion,
                            id_referencia: auditData.id_referencia || null,
                            id_usuario: auditData.id_usuario || null,
                            fecha: auditData.timestamp || new Date(),
                            descripcion: auditData.mensaje || auditData.descripcion || 'Acción registrada por el sistema',
                            datos_anteriores: auditData.datos_anteriores || {},
                            datos_nuevos: auditData.datos_nuevos || {}
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

// Health check para el Orquestador
app.get('/health', async (req, res) => {
    try {
        const { data, error } = await supabase.from('auditoria').select('fecha').limit(1);
        if (error) throw error;
        res.json({
            status: 'Auditoría Activa',
            db_connected: true,
            sync_time: new Date()
        });
    } catch (e) {
        res.status(500).json({ status: 'Error', db_connected: false, message: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 MS-Auditoría (Cloud Persistence) iniciado en puerto ${PORT}`);
});

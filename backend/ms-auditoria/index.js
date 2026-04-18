const express = require('express');
const amqp = require('amqplib');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4004;
const RABBIT_URL = process.env.RABBIT_URL || 'amqp://guest:guest@rabbitmq:5672';

// 📡 CONFIGURACIÓN DE BASE DE DATOS (Supabase Cloud)
// Usamos la URL de conexión directa con la contraseña proporcionada
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

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
                    // Mapeo de datos para la tabla 'auditoria'
                    const query = `
                        INSERT INTO auditoria (
                            modulo, 
                            tipo_accion, 
                            id_referencia, 
                            id_usuario, 
                            fecha, 
                            descripcion, 
                            datos_anteriores, 
                            datos_nuevos
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    `;

                    const values = [
                        auditData.modulo || 'SISTEMA',
                        auditData.tipo_accion,
                        auditData.id_referencia || null,
                        auditData.id_usuario || null,
                        auditData.timestamp || new Date(),
                        auditData.mensaje || auditData.descripcion || 'Acción registrada por el sistema',
                        JSON.stringify(auditData.datos_anteriores || {}),
                        JSON.stringify(auditData.datos_nuevos || {})
                    ];

                    await pool.query(query, values);
                    console.log('✅ [MS-AUDITORIA]: Evento guardado con éxito en la nube.');

                    channel.ack(msg); // Confirmar procesamiento
                } catch (dbError) {
                    console.error('❌ [MS-AUDITORIA]: Error guardando en DB:', dbError.message);
                    // No hacemos ack para que el mensaje vuelva a la cola si falló la DB
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
        const dbStatus = await pool.query('SELECT NOW()');
        res.json({
            status: 'Auditoría Activa',
            db_connected: true,
            server_time: dbStatus.rows[0].now
        });
    } catch (e) {
        res.status(500).json({ status: 'Error', db_connected: false });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 MS-Auditoría (Cloud Persistence) iniciado en puerto ${PORT}`);
});

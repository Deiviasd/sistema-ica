const express = require('express');
const amqp = require('amqplib');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4004;
const RABBIT_URL = process.env.RABBIT_URL || 'amqp://guest:guest@rabbitmq:5672';

// 👂 CONSUMIDOR DE RABBITMQ
async function startConsumer() {
    try {
        const connection = await amqp.connect(RABBIT_URL);
        const channel = await connection.createChannel();
        const queue = 'audit_queue';

        await channel.assertQueue(queue, { durable: true });
        console.log(`📡 [MS-AUDITORIA]: Esperando mensajes en la cola [${queue}]...`);

        channel.consume(queue, (msg) => {
            if (msg !== null) {
                const auditData = JSON.parse(msg.content.toString());
                console.log('📝 [MS-AUDITORIA]: Nuevo evento recibido:', auditData);
                
                // AQUÍ ES DONDE GUARDARÍAS EN SUPABASE
                // const { data, error } = await supabase.from('auditoria').insert(auditData);

                channel.ack(msg); // Confirmar que se procesó
            }
        });
    } catch (error) {
        console.error('❌ [MS-AUDITORIA]: Error en el consumidor:', error.message);
        setTimeout(startConsumer, 5000);
    }
}

// Iniciar consumidor
startConsumer();

app.get('/health', (req, res) => res.json({ status: 'Auditoria Online & Listening' }));

app.listen(PORT, () => {
    console.log(`✅ MS-Auditoría iniciado en puerto ${PORT}`);
});

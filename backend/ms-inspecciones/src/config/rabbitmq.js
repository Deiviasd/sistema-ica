const amqp = require('amqplib');
require('dotenv').config();

const RABBIT_URL = process.env.RABBIT_URL || 'amqp://guest:guest@rabbitmq:5672';
const QUEUE_NAME = 'inspecciones_queue';

async function startConsumer() {
    try {
        const connection = await amqp.connect(RABBIT_URL);
        const channel = await connection.createChannel();

        await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log(`📡 [MS-INSPECCIONES]: Escuchando eventos ICA en [${QUEUE_NAME}]...`);

        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                try {
                    const event = JSON.parse(msg.content.toString());
                    console.log(`📝 [MS-INSPECCIONES]: Evento recibido -> ${event.tipo}`);

                    if (event.tipo === 'SIEMBRA_FINALIZADA') {
                        console.log(`🚜 Programando inspección automática para predio del productor ${event.productor_id || 'N/A'}...`);
                        // Aquí iría la lógica de agendamiento automático
                    }

                    // IMPORTANTE: Confirmar el mensaje siempre para que salga de la cola
                    channel.ack(msg);
                } catch (consumeErr) {
                    console.error('❌ Error procesando mensaje de RabbitMQ:', consumeErr.message);
                    // Confirmamos incluso con error para evitar bucles infinitos de re-entrega si el mensaje está roto
                    channel.ack(msg);
                }
            }
        });
    } catch (error) {
        console.error('❌ Error conectando a RabbitMQ. Reintentando en 5 segundos...', error.message);
        setTimeout(startConsumer, 5000);
    }
}

module.exports = {
    startConsumer
};

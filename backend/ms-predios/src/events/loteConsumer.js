const amqp = require('amqplib');
const predioRepository = require('../repositories/predioRepository');

const RABBIT_URL = process.env.RABBIT_URL || 'amqp://guest:guest@rabbitmq:5672';

async function startLoteConsumer() {
    try {
        const connection = await amqp.connect(RABBIT_URL);
        const channel = await connection.createChannel();
        const queue = 'lotes_queue'; 

        await channel.assertQueue(queue, { durable: true });
        console.log(`📡 [MS-PREDIOS]: Sincronizado con RabbitMQ en [${queue}]...`);

        channel.consume(queue, async (msg) => {
            if (msg !== null) {
                const event = JSON.parse(msg.content.toString());
                
                if (event.tipo === 'SIEMBRA_FINALIZADA') {
                    console.log(`🌿 [MS-PREDIOS]: Lote ${event.id_lote} -> Disponible`);
                    await predioRepository.updateLoteEstado(event.id_lote, 'disponible');
                }

                if (event.tipo === 'NUEVA_SIEMBRA') {
                    console.log(`🚜 [MS-PREDIOS]: Lote ${event.id_lote} -> Ocupado`);
                    const lote = await predioRepository.getLoteById(event.id_lote);
                    if (lote && (lote.estado === 'disponible' || lote.estado === 'inactivo')) {
                        await predioRepository.updateLoteEstado(event.id_lote, 'ocupado');
                    }
                }
                channel.ack(msg);
            }
        });
    } catch (error) {
        console.error('❌ Error en Consumidor RabbitMQ:', error.message);
        setTimeout(startLoteConsumer, 5000);
    }
}

module.exports = startLoteConsumer;

const amqp = require('amqplib');

let channel = null;

const connect = async () => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
        channel = await connection.createChannel();
        console.log('✅ MS-AUTH: Conectado a RabbitMQ');
    } catch (error) {
        console.error('❌ MS-AUTH: Error conectando a RabbitMQ:', error.message);
        // Reintentar en 5 segundos
        setTimeout(connect, 5000);
    }
};

const publish = (queue, message) => {
    if (!channel) {
        console.error('❌ Canal RabbitMQ no disponible para MS-AUTH');
        return;
    }
    channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
};

module.exports = { connect, publish };

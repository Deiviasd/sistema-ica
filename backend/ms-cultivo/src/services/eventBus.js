const amqp = require('amqplib');

let channel = null;

const connect = async () => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672');
        channel = await connection.createChannel();
        console.log('✅ MS-CULTIVO: Conectado a RabbitMQ');
    } catch (error) {
        console.error('❌ MS-CULTIVO: Error conectando a RabbitMQ:', error.message);
        setTimeout(connect, 5000);
    }
};

const publish = (queue, message) => {
    if (!channel) return;
    channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
};

module.exports = { connect, publish };

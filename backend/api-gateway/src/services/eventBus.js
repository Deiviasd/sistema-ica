const amqp = require('amqplib');

/**
 * Servicio de Event Bus para comunicación asíncrona mediante RabbitMQ
 */
class EventBus {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.url = process.env.RABBIT_URL || 'amqp://guest:guest@rabbitmq:5672';
    }

    async connect() {
        try {
            this.connection = await amqp.connect(this.url);
            this.channel = await this.connection.createChannel();
            console.log('🔌 [EventBus]: Conectado a RabbitMQ con éxito');
        } catch (error) {
            console.error('❌ [EventBus]: Error conectando a RabbitMQ:', error.message);
            // Reintento en 5 segundos
            setTimeout(() => this.connect(), 5000);
        }
    }

    /**
     * Envía un mensaje a una cola específica
     * @param {string} queue Nombre de la cola
     * @param {object} message Datos a enviar
     */
    async publish(queue, message) {
        if (!this.channel) {
            console.error('❌ [EventBus]: Canal no inicializado');
            return;
        }

        try {
            await this.channel.assertQueue(queue, { durable: true });
            this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
                persistent: true
            });
            console.log(`📤 [EventBus]: Mensaje enviado a la cola [${queue}]`);
        } catch (error) {
            console.error(`❌ [EventBus]: Error enviando mensaje a ${queue}:`, error.message);
        }
    }
}

module.exports = new EventBus();




module.exports = {
    RABBIT_URL: process.env.RABBIT_URL || 'amqp://guest:guest@rabbitmq:5672',
    QUEUE_NAME: 'audit_queue'
};

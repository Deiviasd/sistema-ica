const amqp = require('amqplib');
const rabbitConfig = require('../configuracion/rabbitmq');
const auditoriaServicio = require('../servicios/auditoria.servicio');

async function iniciarConsumidor() {
    try {
        const connection = await amqp.connect(rabbitConfig.RABBIT_URL);
        const channel = await connection.createChannel();
        const queue = rabbitConfig.QUEUE_NAME;

        await channel.assertQueue(queue, { durable: true });
        console.log(`📡 [MS-AUDITORIA]: Escuchando eventos ICA en [${queue}]...`);

        channel.consume(queue, async (msg) => {
            if (msg !== null) {
                const auditData = JSON.parse(msg.content.toString());
                console.log('📝 [MS-AUDITORIA]: Procesando evento:', auditData.tipo_accion);

                try {
                    await auditoriaServicio.registrarLog(auditData);
                    console.log('✅ [MS-AUDITORIA]: Evento guardado con éxito en Supabase.');
                    channel.ack(msg);
                } catch (dbError) {
                    console.error('❌ [MS-AUDITORIA]: Error guardando en Supabase:', dbError.message);
                }
            }
        });
    } catch (error) {
        console.error('❌ [MS-AUDITORIA]: Error en el bus de eventos:', error.message);
        setTimeout(iniciarConsumidor, 5000);
    }
}

module.exports = { iniciarConsumidor };

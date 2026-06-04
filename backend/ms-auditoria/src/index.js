require('dotenv').config();
const app = require('./app');
const { iniciarConsumidor } = require('./consumidores/auditoria.consumidor');

const PORT = process.env.PORT || 4004;

// Iniciar consumidor de eventos RabbitMQ
iniciarConsumidor();

// Iniciar el servidor HTTP
app.listen(PORT, () => {
    console.log(`🚀 MS-Auditoría iniciado en puerto ${PORT}`);
});

require('dotenv').config();
const app = require('./app');
const eventBus = require('./configuracion/eventbus');

// 🔌 Conectar a RabbitMQ al iniciar
eventBus.connect();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`📡 Orquestador ICA activo en puerto ${PORT} con soporte Multi-Cuenta`);
});
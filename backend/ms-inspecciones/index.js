const express = require('express');
const cors = require('cors');
require('dotenv').config();

const inspeccionRoutes = require('./src/routes/inspeccionRoutes');
const evidenceRoutes = require('./src/routes/evidenceRoutes');
const { startConsumer } = require('./src/config/rabbitmq');

const app = express();
app.use(cors());
app.use(express.json());

// Montar las rutas centralizadas
app.use('/', inspeccionRoutes);
app.use('/evidencias', evidenceRoutes);

const PORT = process.env.PORT || 4003;

// Iniciar consumidor de eventos de RabbitMQ
startConsumer();

app.listen(PORT, () => {
    console.log(`🚀 MS-Inspecciones: ejecutándose en puerto ${PORT}`);
});

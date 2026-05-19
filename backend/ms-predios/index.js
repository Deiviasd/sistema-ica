const express = require('express');
const cors = require('cors');
require('dotenv').config();
const predioRoutes = require('./src/routes/predioRoutes');
const startLoteConsumer = require('./src/events/loteConsumer');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4001;

// Rutas
app.use('/', predioRoutes);

// Iniciar Consumidor de Eventos (RabbitMQ)
startLoteConsumer();

app.listen(PORT, () => {
    console.log(`✅ MS-Predios (Arquitectura 3 Capas): Escuchando en puerto ${PORT}`);
});

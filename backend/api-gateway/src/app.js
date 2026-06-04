const express = require('express');
const cors = require('cors');
const autenticacionRutas = require('./rutas/autenticacion.rutas');
const orquestadorRutas = require('./rutas/orquestador.rutas');
const proxiesRutas = require('./rutas/proxies.rutas');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cors());

// Registro de rutas
app.use('/auth', autenticacionRutas);
app.use('/api', orquestadorRutas);
app.use('/', proxiesRutas);

// Endpoint general de healthcheck
app.get('/health', (req, res) => res.json({ status: 'Orchestrator Online [Token Swapper Active]' }));

// Middleware de manejo de errores
app.use(errorHandler);

module.exports = app;

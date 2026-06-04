const express = require('express');
const cors = require('cors');
const auditoriaRutas = require('./rutas/auditoria.rutas');

const app = express();

app.use(express.json());
app.use(cors());

// Rutas
app.use('/', auditoriaRutas);

module.exports = app;

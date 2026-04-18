require('dotenv').config()
const express = require('express')
const cors = require('cors')
const eventBus = require('./services/eventBus')
const siembraRoutes = require('./routes/siembra.routes')

const app = express()

app.use(cors())
app.use(express.json())

// Conectar RabbitMQ
eventBus.connect()

// Rutas
app.use('/siembras', siembraRoutes)

// Health
app.get('/health', (req, res) => res.json({ 
    status: 'MS-CULTIVO Online',
    messaging: 'RabbitMQ Connected'
}))

const PORT = process.env.PORT || 4002

app.listen(PORT, () => {
    console.log(`🌿 MS-CULTIVO corriendo en puerto ${PORT}`)
})

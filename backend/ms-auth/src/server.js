
const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/auth.routes')
const catalogoRoutes = require('./routes/catalogo.routes')

const eventBus = require('./services/eventBus')

const app = express()

app.use(cors())
app.use(express.json())

// 🔌 Conectar a RabbitMQ para auditoría
eventBus.connect()

// 🔐 Aquí conectamos las rutas reales
app.use(authRoutes)
app.use('/catalogos', catalogoRoutes)


const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
    console.log(`MS-AUTH corriendo en puerto ${PORT}`)
})
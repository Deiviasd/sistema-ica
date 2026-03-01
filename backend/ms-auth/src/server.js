
const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/auth.routes')

const app = express()

app.use(cors())
app.use(express.json())

// 🔐 Aquí conectamos las rutas reales
app.use(authRoutes)

const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
    console.log(`MS-AUTH corriendo en puerto ${PORT}`)
})

const express = require('express')
const cors = require('cors')

const userRoutes = require('./routes/user.routes')

const app = express()

app.use(cors())
app.use(express.json())

app.use(userRoutes)

const PORT = process.env.PORT || 4001

app.listen(PORT, () => {
    console.log(`MS-USERS corriendo en puerto ${PORT}`)
})
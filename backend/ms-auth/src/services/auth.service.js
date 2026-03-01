const bcrypt = require('bcrypt')
const { createUser, findUserByEmail } = require('../repositories/user.repository')
const jwt = require('jsonwebtoken')

const registerService = async ({ email, password }) => {

    if (!email || !password) {
        throw new Error('Email y password requeridos')
    }

    const existingUser = await findUserByEmail(email)

    if (existingUser) {
        throw new Error('Usuario ya existe')
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await createUser({
        email,
        password: hashedPassword
    })

    return {
        id: user.id,
        email: user.email
    }
}

const loginService = async ({ email, password }) => {

    if (!email || !password) {
        throw new Error('Email y password requeridos')
    }

    const user = await findUserByEmail(email)

    if (!user) {
        throw new Error('Usuario no encontrado')
    }

    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
        throw new Error('Credenciales inválidas')
    }

    const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    )

    return { token }
}

module.exports = { loginService, registerService }
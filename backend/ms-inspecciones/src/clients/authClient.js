const axios = require('axios');
require('dotenv').config();

const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://ms-auth:4000';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

const getUsuarioById = async (userId, headers = {}) => {
    try {
        const response = await axios.get(`${AUTH_URL}/auth/usuarios/${userId}`, {
            headers: {
                ...headers,
                'x-internal-key': INTERNAL_API_KEY
            }
        });
        return response.data;
    } catch (error) {
        console.error(`⚠️ Error fetching usuario ${userId} from MS-AUTH:`, error.message);
        throw error;
    }
};

const getTecnicos = async () => {
    try {
        const response = await axios.get(`${AUTH_URL}/auth/usuarios/rol/tecnico`);
        return response.data;
    } catch (error) {
        console.error('⚠️ Error fetching técnicos from MS-AUTH:', error.message);
        throw error;
    }
};

module.exports = {
    getUsuarioById,
    getTecnicos
};

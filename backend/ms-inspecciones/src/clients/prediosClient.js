const axios = require('axios');
require('dotenv').config();

const PREDIOS_URL = process.env.PREDIOS_SERVICE_URL || 'http://ms-predios:4001';

const getLugaresProduccion = async (headers = {}) => {
    try {
        const response = await axios.get(`${PREDIOS_URL}/lugares-produccion`, { headers });
        return response.data;
    } catch (error) {
        console.error('⚠️ Error fetching lugares de producción from MS-PREDIOS:', error.message);
        throw error;
    }
};

module.exports = {
    getLugaresProduccion
};

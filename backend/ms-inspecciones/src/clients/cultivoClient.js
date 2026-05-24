const axios = require('axios');
require('dotenv').config();

const CULTIVO_URL = process.env.CULTIVO_SERVICE_URL || 'http://ms-cultivo:4002';

const getSiembrasByLote = async (idLote, headers = {}, includeHistory = false) => {
    try {
        const historyQuery = includeHistory ? '&historial=true' : '';
        const response = await axios.get(`${CULTIVO_URL}/siembras?id_lote=${idLote}${historyQuery}`, { headers });
        return response.data;
    } catch (error) {
        console.error(`⚠️ Error fetching siembras for lote ${idLote} from MS-CULTIVO:`, error.message);
        throw error;
    }
};

const getSiembraById = async (idSiembra, headers = {}) => {
    try {
        const response = await axios.get(`${CULTIVO_URL}/siembras/${idSiembra}`, { headers });
        return response.data;
    } catch (error) {
        console.error(`⚠️ Error fetching siembra ${idSiembra} from MS-CULTIVO:`, error.message);
        throw error;
    }
};

const getPlagas = async (headers = {}) => {
    try {
        const response = await axios.get(`${CULTIVO_URL}/plagas`, { headers });
        return response.data;
    } catch (error) {
        console.error('⚠️ Error fetching plagas from MS-CULTIVO:', error.message);
        throw error;
    }
};

module.exports = {
    getSiembrasByLote,
    getSiembraById,
    getPlagas
};

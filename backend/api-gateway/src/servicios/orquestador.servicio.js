const clientesApi = require('../integraciones/clientes-api');
const eventBus = require('../configuracion/eventbus');

class OrquestadorServicio {
    async crearLoteIntegral(reqUser, body) {
        let loteId = null;
        let siembraId = null;

        const {
            id_lugar_produccion, nombre_lote, area, especie, variedad, fecha_siembra
        } = body;

        // 1. Registrar Lote en ms-predios
        try {
            const loteResponse = await clientesApi.predios.post('/lotes', {
                id_lugar_produccion, nombre_lote, area
            }, clientesApi.getAuthHeaders(reqUser, 'JWT_SECRET_PREDIOS'));

            loteId = loteResponse.data.id_lote;
            
            // 2. Registrar Siembra en ms-cultivo
            const siembraResponse = await clientesApi.cultivo.post('/siembras', {
                id_lote: loteId,
                id_variedad: 1, // Por defecto o mapeado de la variedad del body
                fecha_siembra
            }, clientesApi.getAuthHeaders(reqUser, 'JWT_SECRET_CULTIVOS'));

            siembraId = siembraResponse.data.id_siembra;

            // 3. Publicar evento de auditoría
            eventBus.publish('audit_queue', {
                modulo: 'registro_agricola',
                tipo_accion: 'CREATE_LOTE_INTEGRAL',
                id_referencia: `Lote:${loteId}|Siembra:${siembraId}`,
                id_usuario: reqUser.id,
                timestamp: new Date().toISOString()
            });

            return {
                lote: loteResponse.data,
                siembra: siembraResponse.data
            };
        } catch (error) {
            console.error('❌ Error en Registro Integral:', error.message);
            // 🔄 Compensación (Rollback): Si creamos el lote pero no la siembra, revertimos el lote
            if (loteId && !siembraId) {
                console.log('🔄 Ejecutando rollback para el lote:', loteId);
                await clientesApi.predios.patch(`/lotes/${loteId}/estado`, { estado: 'disponible' })
                    .catch((e) => console.error('⚠️ Falló rollback de lote:', e.message));
            }
            throw error;
        }
    }

    async obtenerResumenDashboard(reqUser) {
        const userRole = reqUser?.app_metadata?.role || reqUser?.role;

        // Cabeceras de autenticación re-firmadas para cada microservicio
        const prediosHeaders = clientesApi.getAuthHeaders(reqUser, 'JWT_SECRET_PREDIOS');
        const cultivosHeaders = clientesApi.getAuthHeaders(reqUser, 'JWT_SECRET_CULTIVOS');
        const inspeccionesHeaders = clientesApi.getAuthHeaders(reqUser, 'JWT_SECRET_INSPECCIONES');

        const injectUserHeaders = (config) => ({
            ...config,
            headers: {
                ...config.headers,
                'x-internal-key': process.env.INTERNAL_API_KEY,
                'x-user-id': reqUser?.id_usuario || reqUser?.id,
                'x-user-role': userRole
            }
        });

        // 🚀 Ejecución en paralelo
        const [prediosRes, siembrasRes, inspeccionesRes] = await Promise.allSettled([
            clientesApi.predios.get('/list', injectUserHeaders(prediosHeaders)),
            clientesApi.cultivo.get('/siembras', injectUserHeaders(cultivosHeaders)),
            clientesApi.inspecciones.get('/reporte', injectUserHeaders(inspeccionesHeaders))
        ]);

        return {
            predios: prediosRes.status === 'fulfilled' ? prediosRes.value.data : [],
            siembras: siembrasRes.status === 'fulfilled' ? siembrasRes.value.data : [],
            inspecciones: inspeccionesRes.status === 'fulfilled' ? inspeccionesRes.value.data : []
        };
    }
}

module.exports = new OrquestadorServicio();

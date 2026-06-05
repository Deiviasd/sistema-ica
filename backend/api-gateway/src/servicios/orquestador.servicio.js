const clientesApi = require('../integraciones/clientes-api');
const eventBus = require('../configuracion/eventbus');
const sagaServicio = require('./saga.servicio');

class OrquestadorServicio {
    async crearLoteIntegral(req) {
        const reqUser = req.user;
        const correlationId = req.correlationId;
        const body = req.body;
        
        const txId = sagaServicio.iniciarTransaccion(`LOTE_INTEGRAL_${correlationId}`);

        try {
            const {
                id_lugar_produccion, nombre_lote, area, especie, variedad, fecha_siembra
            } = body;

            // 1. Registrar Lote en ms-predios
            const loteResponse = await clientesApi.predios.post('/lotes', {
                id_lugar_produccion, nombre_lote, area
            }, clientesApi.getAuthHeaders(req, 'JWT_SECRET_PREDIOS'));

            const loteId = loteResponse.data.id_lote;
            
            // Registrar paso de compensación
            sagaServicio.registrarPasoCompletado(txId, 'CREAR_LOTE', async () => {
                await clientesApi.predios.patch(`/lotes/${loteId}/estado`, { estado: 'disponible' }, {
                    headers: { 'x-correlation-id': correlationId }
                });
            });

            // 2. Registrar Siembra en ms-cultivo
            const siembraResponse = await clientesApi.cultivo.post('/siembras', {
                id_lote: loteId,
                id_variedad: 1, // Por defecto o mapeado de la variedad del body
                fecha_siembra
            }, clientesApi.getAuthHeaders(req, 'JWT_SECRET_CULTIVOS'));

            const siembraId = siembraResponse.data.id_siembra;

            sagaServicio.registrarPasoCompletado(txId, 'CREAR_SIEMBRA', async () => {
                // await clientesApi.cultivo.delete(`/siembras/${siembraId}`);
                console.warn(`[SAGA COMPENSACION] Borrado de siembra aún no expuesto.`);
            });

            // 3. Publicar evento de auditoría asíncrono
            eventBus.publish('audit_queue', {
                modulo: 'registro_agricola',
                tipo_accion: 'CREATE_LOTE_INTEGRAL',
                id_referencia: `Lote:${loteId}|Siembra:${siembraId}`,
                id_usuario: reqUser.id,
                timestamp: new Date().toISOString()
            });

            sagaServicio.completarTransaccion(txId);

            return {
                lote: loteResponse.data,
                siembra: siembraResponse.data
            };
        } catch (error) {
            await sagaServicio.abortarTransaccion(txId, error);
            throw error;
        }
    }

    async obtenerResumenDashboard(req) {
        const reqUser = req.user;
        const userRole = reqUser?.app_metadata?.role || reqUser?.role;

        // Cabeceras de autenticación re-firmadas para cada microservicio
        const prediosHeaders = clientesApi.getAuthHeaders(req, 'JWT_SECRET_PREDIOS');
        const cultivosHeaders = clientesApi.getAuthHeaders(req, 'JWT_SECRET_CULTIVOS');
        const inspeccionesHeaders = clientesApi.getAuthHeaders(req, 'JWT_SECRET_INSPECCIONES');

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

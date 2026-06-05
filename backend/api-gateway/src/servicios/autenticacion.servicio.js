const clientesApi = require('../integraciones/clientes-api');
const sagaServicio = require('./saga.servicio');

class AutenticacionServicio {
    async verificarEmail(email) {
        try {
            const checkRes = await clientesApi.auth.get(`check-email/${encodeURIComponent(email)}`, {
                headers: { 'x-internal-key': process.env.INTERNAL_API_KEY }
            });
            return checkRes.data.exists;
        } catch (err) {
            console.warn('⚠️ [ORQUESTADOR] No se pudo verificar el email:', err.message || err);
            return false;
        }
    }

    async registrarUsuario(userData, correlationId) {
        const txId = sagaServicio.iniciarTransaccion(`REGISTRO_USUARIO_${correlationId}`);

        try {
            const {
                nombre, documento, email, password, id_rol,
                nombre_predio, numero_predial,
                departamento, municipio, vereda, direccion
            } = userData;

            // 1. Verificar si el email existe
            const emailExiste = await this.verificarEmail(email);
            if (emailExiste) {
                throw { status: 400, message: 'Ya existe un usuario registrado con este correo electrónico' };
            }

            // 2. Crear la Región en ms-predios
            let id_region = null;
            try {
                const regionRes = await clientesApi.predios.post('/regiones', {
                    departamento, municipio, vereda, direccion
                }, { headers: { 'x-correlation-id': correlationId } });
                
                id_region = regionRes.data.id_region;
                console.log(`📍 [ORQUESTADOR] Región creada con ID: ${id_region}`);
                
                // Registrar paso para posible compensación
                sagaServicio.registrarPasoCompletado(txId, 'CREAR_REGION', async () => {
                    await clientesApi.predios.delete(`/regiones/${id_region}`, {
                        headers: { 'x-correlation-id': correlationId }
                    });
                });
            } catch (err) {
                throw { status: 500, message: 'Error al registrar la ubicación geográfica', originalError: err };
            }

            // 3. Crear el Usuario en ms-auth
            let id_usuario = null;
            try {
                const authRes = await clientesApi.auth.post('register', {
                    nombre, documento, email, password, id_rol,
                    id_region: id_region.toString()
                }, { headers: { 'x-correlation-id': correlationId } });

                id_usuario = authRes.data.id;
                console.log(`👤 [ORQUESTADOR] Usuario creado con ID: ${id_usuario}`);
                
                sagaServicio.registrarPasoCompletado(txId, 'CREAR_USUARIO', async () => {
                    // Si implementamos borrado de usuario en auth, se haría aquí.
                    // await clientesApi.auth.delete(`/users/${id_usuario}`);
                    console.warn(`[SAGA COMPENSACION] Borrado físico de usuario en ms-auth aún no expuesto.`);
                });
            } catch (err) {
                const errorMsg = err.message || "Error al crear usuario en ms-auth";
                const msg = errorMsg.includes('Usuario ya existe') ? 'Este correo ya está registrado' : errorMsg;
                throw { status: 400, message: msg, originalError: err };
            }

            // 4. Registrar su Lugar de Producción
            if (id_rol === 'PRODUCTOR') {
                try {
                    await clientesApi.predios.post('/lugares-produccion', {
                        nombre_lugar: nombre_predio || `Operación de ${nombre}`,
                        numero_registro: numero_predial || 'PENDIENTE',
                        productor_id: id_usuario,
                        id_region: id_region
                    }, {
                        headers: {
                            'x-user-id': id_usuario,
                            'x-user-role': id_rol,
                            'x-correlation-id': correlationId
                        }
                    });
                } catch (err) {
                    console.error('⚠️ [ORQUESTADOR] Error al registrar Lugar de Producción, pero el registro general es válido:', err.message);
                }
            }

            sagaServicio.completarTransaccion(txId);
            return { id: id_usuario, email };

        } catch (error) {
            // Si falla algo crítico en el try superior, abortamos la Saga (Rollback)
            await sagaServicio.abortarTransaccion(txId, error);
            throw error;
        }
    }

    async obtenerUsuariosHidratados(status) {
        // 1. Obtener los usuarios base de ms-auth
        const usersRes = await clientesApi.auth.get(`users/by-status?status=${encodeURIComponent(status || 'inactivo')}`);
        const baseUsers = Array.isArray(usersRes.data) ? usersRes.data : [];

        // 2. Hidratar cada usuario con datos de ms-predios
        const hydratedUsers = await Promise.all(baseUsers.map(async (user) => {
            const enrichedUser = {
                ...user,
                id_usuario: user.id_usuario,
                correo: user.email || user.correo
            };

            // Traer Región si existe
            if (user.id_region) {
                try {
                    const regionRes = await clientesApi.predios.get(`/regiones/${user.id_region}`);
                    enrichedUser.region = regionRes.data;
                } catch (e) {
                    console.warn(`⚠️ No se pudo cargar región para usuario ${user.id_usuario}`);
                }
            }

            // Traer Lugar de Producción si es PRODUCTOR
            if (user.id_rol === 'PRODUCTOR') {
                try {
                    const lugarRes = await clientesApi.predios.get('/lugares-produccion', {
                        headers: {
                            'x-user-id': user.id_usuario,
                            'x-user-role': user.id_rol
                        }
                    });
                    enrichedUser.usuario_predio = (lugarRes.data || []).map(l => ({
                        nombre_predio: l.nombre_lugar,
                        numero_predial: l.numero_registro
                    }));
                } catch (e) {
                    console.warn(`⚠️ No se pudo cargar lugar para usuario ${user.id_usuario}`);
                }
            }

            return enrichedUser;
        }));

        return hydratedUsers;
    }
}

module.exports = new AutenticacionServicio();

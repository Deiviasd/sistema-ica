const clientesApi = require('../integraciones/clientes-api');

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

    async registrarUsuario(userData) {
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
            });
            id_region = regionRes.data.id_region;
            console.log(`📍 [ORQUESTADOR] Región creada con ID: ${id_region}`);
        } catch (err) {
            throw { status: 500, message: 'Error al registrar la ubicación geográfica' };
        }

        // 3. Crear el Usuario en ms-auth pasando el id_region
        let id_usuario = null;
        try {
            const authRes = await clientesApi.auth.post('register', {
                nombre, documento, email, password, id_rol,
                id_region: id_region.toString()
            });

            const newUser = authRes.data;
            id_usuario = newUser.id;
            console.log(`👤 [ORQUESTADOR] Usuario creado con ID: ${id_usuario}`);
        } catch (err) {
            // 🔄 ROLLBACK: Si falla el usuario, borramos la región creada
            console.error('❌ [ORQUESTADOR] Falló creación de usuario, ejecutando rollback de región...');
            await clientesApi.predios.delete(`/regiones/${id_region}`).catch(e => 
                console.error('⚠️ Falló rollback de región:', e.message)
            );

            const errorMsg = err.response?.data?.error || err.message || "";
            const msg = errorMsg.includes('Usuario ya existe')
                ? 'Este correo ya está registrado'
                : (errorMsg || 'Error en el proceso de registro');

            throw { status: 400, message: msg };
        }

        // 4. Si es Productor, registrar su Lugar de Producción (Registro Legal)
        if (id_rol === 'PRODUCTOR') {
            try {
                console.log(`🏢 [ORQUESTADOR] Registrando Lugar de Producción para ID: ${id_usuario}`);

                await clientesApi.predios.post('/lugares-produccion', {
                    nombre_lugar: nombre_predio || `Operación de ${nombre}`,
                    numero_registro: numero_predial || 'PENDIENTE',
                    productor_id: id_usuario,
                    id_region: id_region
                }, {
                    headers: {
                        'x-user-id': id_usuario,
                        'x-user-role': id_rol
                    }
                });
            } catch (err) {
                console.error('⚠️ [ORQUESTADOR] Error al registrar Lugar de Producción:', err.message);
            }
        }

        return { id: id_usuario, email };
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

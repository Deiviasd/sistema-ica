const { supabase } = require('../config/supabase');

/**
 * Servicio para gestionar la carga de evidencias fotográficas en Supabase Storage
 * y persistencia en la tabla evidencia_inspeccion.
 */

const guardarEvidencia = async (idDetalle, fotoBase64, latitud, longitud) => {
    try {
        if (!idDetalle) {
            throw new Error('El ID de detalle de inspección es requerido');
        }
        if (!fotoBase64) {
            throw new Error('La imagen en formato Base64 es requerida');
        }

        // Limpiar el encabezado de base64 si existe (ej. "data:image/webp;base64,")
        const matches = fotoBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        let base64Clean = fotoBase64;
        let mimeType = 'image/webp';

        if (matches && matches.length === 3) {
            mimeType = matches[1];
            base64Clean = matches[2];
        }

        // Decodificar Base64 a un Buffer binario para Supabase Storage
        const buffer = Buffer.from(base64Clean, 'base64');
        const extension = mimeType.split('/')[1] || 'webp';
        
        // Generar nombre de archivo único
        const nombreArchivo = `evidencia_${idDetalle}_${Date.now()}.${extension}`;

        // 1. Subir Buffer a Supabase Storage
        console.log(`📤 Subiendo archivo ${nombreArchivo} a bucket evidencias-inspeccion...`);
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('evidencias-inspeccion')
            .upload(nombreArchivo, buffer, {
                contentType: mimeType,
                upsert: true
            });

        if (uploadError) {
            console.error('❌ Error subiendo a Supabase Storage:', uploadError);
            throw new Error(`Error en storage: ${uploadError.message}`);
        }

        // 2. Obtener URL pública de la imagen
        const { data: urlData } = supabase.storage
            .from('evidencias-inspeccion')
            .getPublicUrl(nombreArchivo);

        if (!urlData || !urlData.publicUrl) {
            throw new Error('No se pudo generar la URL pública de la imagen');
        }

        const publicUrl = urlData.publicUrl;
        console.log(`🔗 URL Pública generada: ${publicUrl}`);

        // 3. Registrar metadata e imagen en la base de datos
        const { data: dbData, error: dbError } = await supabase
            .from('evidencia_inspeccion')
            .insert([{
                id_detalle_inspeccion: parseInt(idDetalle, 10),
                imagen_url: publicUrl,
                latitud: latitud ? parseFloat(latitud) : null,
                longitud: longitud ? parseFloat(longitud) : null
            }])
            .select();

        if (dbError) {
            console.error('❌ Error registrando evidencia en DB:', dbError);
            throw new Error(`Error en base de datos: ${dbError.message}`);
        }

        return dbData[0];
    } catch (error) {
        console.error('💥 Error crítico en guardarEvidencia:', error.message);
        throw error;
    }
};

const obtenerEvidenciasPorDetalle = async (idDetalle) => {
    try {
        const { data, error } = await supabase
            .from('evidencia_inspeccion')
            .select('*')
            .eq('id_detalle_inspeccion', parseInt(idDetalle, 10))
            .order('fecha_creacion', { ascending: true });

        if (error) {
            console.error('❌ Error obteniendo evidencias de la DB:', error);
            throw new Error(`Error en base de datos: ${error.message}`);
        }

        return data || [];
    } catch (error) {
        console.error('💥 Error en obtenerEvidenciasPorDetalle:', error.message);
        throw error;
    }
};

const obtenerNombreArchivoDesdeUrl = (imagenUrl) => {
    if (!imagenUrl) return null;
    const marker = '/evidencias-inspeccion/';
    const markerIndex = imagenUrl.indexOf(marker);
    if (markerIndex === -1) return null;
    return decodeURIComponent(imagenUrl.slice(markerIndex + marker.length).split('?')[0]);
};

const eliminarEvidencia = async (idEvidencia) => {
    try {
        const id = parseInt(idEvidencia, 10);
        if (!id) {
            throw new Error('El ID de evidencia es requerido');
        }

        let evidencia = null;
        let columnaId = null;

        for (const columna of ['id_evidencia', 'id_evidencia_inspeccion', 'id']) {
            const { data, error } = await supabase
                .from('evidencia_inspeccion')
                .select('*')
                .eq(columna, id)
                .maybeSingle();

            if (!error && data) {
                evidencia = data;
                columnaId = columna;
                break;
            }
        }

        if (!evidencia || !columnaId) {
            throw new Error('No se encontró la evidencia solicitada');
        }

        const { error: deleteError } = await supabase
            .from('evidencia_inspeccion')
            .delete()
            .eq(columnaId, id);

        if (deleteError) {
            console.error('❌ Error eliminando evidencia en DB:', deleteError);
            throw new Error(`Error en base de datos: ${deleteError.message}`);
        }

        const nombreArchivo = obtenerNombreArchivoDesdeUrl(evidencia?.imagen_url);
        if (nombreArchivo) {
            const { error: storageError } = await supabase.storage
                .from('evidencias-inspeccion')
                .remove([nombreArchivo]);

            if (storageError) {
                console.warn('⚠️ Evidencia eliminada de DB, pero no se pudo eliminar el archivo de Storage:', storageError.message);
            }
        }
    } catch (error) {
        console.error('💥 Error en eliminarEvidencia:', error.message);
        throw error;
    }
};

module.exports = {
    guardarEvidencia,
    obtenerEvidenciasPorDetalle,
    eliminarEvidencia
};

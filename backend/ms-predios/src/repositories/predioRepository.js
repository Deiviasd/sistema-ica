const supabase = require('../config/supabase');

const predioRepository = {
    // --- LUGARES DE PRODUCCIÓN ---
    async getLugaresByProductor(productorId) {
        const { data, error } = await supabase
            .from('lugar_produccion')
            .select(`
                *,
                region(*),
                predio (
                    *,
                    region(*),
                    lote(*)
                )
            `)
            .eq('productor_id', productorId);

        if (error) throw error;
        return data;
    },

    async getAllLugares() {
        const { data, error } = await supabase
            .from('lugar_produccion')
            .select(`
                *,
                region(*),
                predio (
                    *,
                    region(*),
                    lote(*)
                )
            `);

        if (error) throw error;
        return data;
    },

    async createLugar(lugarData) {
        const { data, error } = await supabase
            .from('lugar_produccion')
            .insert([lugarData])
            .select();

        if (error) throw error;
        return data[0];
    },

    // --- PREDIOS ---
    async getPrediosByProductor(productorId) {
        const { data, error } = await supabase
            .from('predio')
            .select(`
                *,
                lugar_produccion!inner(*),
                region(*),
                lote(*)
            `)
            .eq('lugar_produccion.productor_id', productorId);

        if (error) throw error;
        return data;
    },

    async getAllPredios() {
        const { data, error } = await supabase
            .from('predio')
            .select(`
                *,
                lugar_produccion(*),
                region(*),
                lote(*)
            `);

        if (error) throw error;
        return data;
    },

    async createPredio(predioData) {
        const { data, error } = await supabase
            .from('predio')
            .insert([predioData])
            .select();

        if (error) throw error;
        return data[0];
    },

    async deletePredio(id) {
        // First delete any associated lotes to avoid foreign key constraint violations
        const { error: loteError } = await supabase
            .from('lote')
            .delete()
            .eq('id_predio', id);
        if (loteError) throw loteError;

        // Then delete the predio
        const { error: predioError } = await supabase
            .from('predio')
            .delete()
            .eq('id_predio', id);
        if (predioError) throw predioError;

        return true;
    },

    // --- REGIONES ---
    async getRegionById(id) {
        const { data, error } = await supabase
            .from('region')
            .select('*')
            .eq('id_region', id)
            .single();
        if (error) return null;
        return data;
    },

    async createRegion(regionData) {
        const { data, error } = await supabase
            .from('region')
            .insert([regionData])
            .select();

        if (error) throw error;
        return data[0];
    },

    async getRegiones() {
        const { data, error } = await supabase.from('region').select('*');
        if (error) throw error;
        return data;
    },

    async deleteRegion(id) {
        const { error } = await supabase
            .from('region')
            .delete()
            .eq('id_region', id);

        if (error) throw error;
        return true;
    },

    // --- LOTES ---
    async createLote(loteData) {
        const { data, error } = await supabase
            .from('lote')
            .insert([loteData])
            .select();

        if (error) throw error;
        return data[0];
    },

    async updateLoteEstado(idLote, estado) {
        const { data, error } = await supabase
            .from('lote')
            .update({ estado })
            .eq('id_lote', idLote)
            .select();

        if (error) throw error;
        return data[0];
    },

    async getLoteById(idLote) {
        const { data, error } = await supabase
            .from('lote')
            .select('estado')
            .eq('id_lote', idLote)
            .single();

        if (error) return null;
        return data;
    },

    async deleteLote(idLote) {
        const { error } = await supabase
            .from('lote')
            .update({ estado: 'inactivo' })
            .eq('id_lote', idLote);
        
        if (error) throw error;
        return true;
    },

    async isPredioUnderInspection(idPredio) {
        try {
            const url = `${process.env.INSPECCIONES_SERVICE_URL || 'http://ms-inspecciones:4003'}/predio/${idPredio}/inspeccion-activa`;
            const response = await fetch(url, {
                headers: {
                    'x-internal-key': process.env.INTERNAL_API_KEY || 'ica-master-key-2026-secure-orchestrator'
                }
            });
            if (!response.ok) return false;
            const data = await response.json();
            return !!data.activa;
        } catch (error) {
            console.error('⚠️ Error al consultar inspección activa por predio via HTTP:', error.message);
            return false;
        }
    },

    async isLugarUnderInspection(idLugar) {
        // Permitir siempre el registro de predios bajo el mismo lugar de producción
        // incluso si hay inspecciones activas en sus predios hermanos.
        return false;
    },

    async isLoteUnderInspection(idLote) {
        const { data: lote, error: loteErr } = await supabase
            .from('lote')
            .select('id_predio')
            .eq('id_lote', idLote)
            .single();
        if (loteErr || !lote) return false;
        return this.isPredioUnderInspection(lote.id_predio);
    }
};

module.exports = predioRepository;

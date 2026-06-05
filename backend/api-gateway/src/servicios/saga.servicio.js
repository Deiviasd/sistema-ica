const eventBus = require('../configuracion/eventbus');
const { v4: uuidv4 } = require('uuid');

/**
 * Gestor básico del Patrón Saga.
 * Maneja el registro de pasos y la ejecución de compensaciones (rollbacks).
 */
class SagaServicio {
    constructor() {
        // Almacenamiento en memoria para demostración.
        // En producción, esto debería estar en Redis o en una tabla 'saga_logs'.
        this.transacciones = new Map();
    }

    /**
     * Inicia una nueva transacción Saga
     * @param {string} nombreFlujo Ej: 'REGISTRO_USUARIO'
     * @returns {string} ID de la transacción
     */
    iniciarTransaccion(nombreFlujo) {
        const idTransaccion = uuidv4();
        this.transacciones.set(idTransaccion, {
            id: idTransaccion,
            flujo: nombreFlujo,
            estado: 'INICIADO', // INICIADO, COMPLETADO, COMPENSANDO, FALLIDO
            pasos: [],
            compensaciones: []
        });

        console.log(`[SAGA] 🟢 Transacción iniciada: ${nombreFlujo} [ID: ${idTransaccion}]`);
        return idTransaccion;
    }

    /**
     * Registra que un paso se ha completado exitosamente y guarda cómo revertirlo.
     * @param {string} idTransaccion 
     * @param {string} nombrePaso 
     * @param {Function} funcionCompensacion Función asíncrona a ejecutar si la saga falla
     */
    registrarPasoCompletado(idTransaccion, nombrePaso, funcionCompensacion) {
        const tx = this.transacciones.get(idTransaccion);
        if (!tx) return;

        tx.pasos.push(nombrePaso);
        
        if (typeof funcionCompensacion === 'function') {
            tx.compensaciones.push({
                paso: nombrePaso,
                revertir: funcionCompensacion
            });
        }
        console.log(`[SAGA] ✅ Paso completado: ${nombrePaso} [TxID: ${idTransaccion}]`);
    }

    /**
     * Marca la transacción como exitosa.
     * @param {string} idTransaccion 
     */
    completarTransaccion(idTransaccion) {
        const tx = this.transacciones.get(idTransaccion);
        if (!tx) return;

        tx.estado = 'COMPLETADO';
        console.log(`[SAGA] 🏁 Transacción completada con éxito [TxID: ${idTransaccion}]`);
        
        // Limpiamos transacciones antiguas de memoria para no saturar
        setTimeout(() => this.transacciones.delete(idTransaccion), 60000);
    }

    /**
     * Aborta la transacción y ejecuta los rollbacks registrados en orden inverso.
     * @param {string} idTransaccion 
     * @param {Error} error 
     */
    async abortarTransaccion(idTransaccion, error) {
        const tx = this.transacciones.get(idTransaccion);
        if (!tx) return;

        tx.estado = 'COMPENSANDO';
        console.error(`[SAGA] ❌ Transacción abortada [TxID: ${idTransaccion}]. Error: ${error.message}`);
        console.log(`[SAGA] 🔄 Iniciando Rollback de ${tx.compensaciones.length} pasos...`);

        // Ejecutar las compensaciones en orden inverso (LIFO)
        const compensacionesInversas = [...tx.compensaciones].reverse();

        for (const comp of compensacionesInversas) {
            try {
                console.log(`[SAGA] ⏪ Revirtiendo paso: ${comp.paso}`);
                await comp.revertir();
                console.log(`[SAGA] ⏪ Paso revertido con éxito: ${comp.paso}`);
            } catch (err) {
                console.error(`[SAGA] 🚨 Error crítico revertiendo paso ${comp.paso}:`, err.message);
                // Si la compensación falla repetidamente, se debería dejar en cola (fuera de alcance de este prototipo)
            }
        }

        tx.estado = 'FALLIDO';
        console.log(`[SAGA] 🛑 Rollback finalizado para [TxID: ${idTransaccion}]`);
        
        setTimeout(() => this.transacciones.delete(idTransaccion), 60000);
    }
}

module.exports = new SagaServicio();

/**
 * Helper para administrar el almacenamiento local en IndexedDB.
 * Permite guardar evidencias fotográficas de forma local y offline sin límites estrictos de espacio.
 */

export interface EvidenciaOffline {
  id_temporal: string;
  id_detalle_inspeccion: string | number;
  foto_base64: string;
  latitud?: number | null;
  longitud?: number | null;
  fecha_creacion: string;
}

export class OfflineDB {
  private dbName = "sistema_ica_offline";
  private version = 1;
  private storeName = "evidencias_pendientes";

  /**
   * Abre o crea la conexión con la base de datos de IndexedDB.
   */
  async open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error("❌ Error abriendo IndexedDB:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          // id_temporal será la clave primaria de cada foto de evidencia
          db.createObjectStore(this.storeName, { keyPath: "id_temporal" });
          console.log(`📦 Almacén '${this.storeName}' creado con éxito en IndexedDB.`);
        }
      };
    });
  }

  /**
   * Guarda una evidencia fotográfica encolada para su sincronización posterior.
   */
  async guardarEvidenciaPendiente(evidencia: EvidenciaOffline): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put(evidencia);

      request.onsuccess = () => {
        console.log(`💾 Evidencia offline guardada con éxito [ID: ${evidencia.id_temporal}].`);
        resolve();
      };

      request.onerror = () => {
        console.error("❌ Error guardando en IndexedDB:", request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Obtiene todas las evidencias que están encoladas pendientes por subir al servidor.
   */
  async obtenerEvidenciasPendientes(): Promise<EvidenciaOffline[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error("❌ Error leyendo de IndexedDB:", request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Elimina una evidencia de la cola local (por ejemplo, después de que se sincronice con éxito).
   */
  async eliminarEvidenciaPendiente(idTemporal: string): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(idTemporal);

      request.onsuccess = () => {
        console.log(`🗑️ Evidencia local eliminada de la cola [ID: ${idTemporal}].`);
        resolve();
      };

      request.onerror = () => {
        console.error("❌ Error eliminando de IndexedDB:", request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Obtiene las evidencias encoladas locales de un lote/detalle específico para mostrarlas de forma offline.
   */
  async obtenerEvidenciasLocalesPorDetalle(idDetalle: string | number): Promise<EvidenciaOffline[]> {
    const todas = await this.obtenerEvidenciasPendientes();
    return todas.filter((item) => String(item.id_detalle_inspeccion) === String(idDetalle));
  }

  /**
   * Actualiza el ID de detalle de una foto encolada localmente.
   * Esto se usa cuando el lote se registra en el servidor y finalmente obtenemos el 'id_detalle' real.
   */
  async asociarDetalleReal(idLote: string | number, idDetalleReal: number): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const todas = request.result || [];

        const filtradas = todas.filter((item) => 
          String(item.id_detalle_inspeccion) === String(idLote) ||
          String(item.id_detalle_inspeccion) === `temp_${idLote}`
        );
        
        for (const item of filtradas) {
          item.id_detalle_inspeccion = idDetalleReal;
          store.put(item);
        }

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      request.onerror = () => reject(request.error);
    });
  }
}

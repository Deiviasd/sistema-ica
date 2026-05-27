import { useEffect, useState } from "react";
import api from "@/lib/api";
import { OfflineDB } from "@/lib/offline-db";

/**
 * Hook global para gestionar la sincronización automática de evidencias fotográficas
 * capturadas offline. Escucha el estado de red y procesa la cola de IndexedDB.
 */
export function useOfflineSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return navigator.onLine;
    }
    return true;
  });

  useEffect(() => {
    const processSyncQueue = async () => {
      if (!navigator.onLine || isSyncing) return;

      const db = new OfflineDB();
      let queue = [];
      try {
        queue = await db.obtenerEvidenciasPendientes();
      } catch (err) {
        console.error("⚠️ Error leyendo cola de IndexedDB para sincronización:", err);
        return;
      }

      // Filtrar ítems que ya tengan un ID de detalle real (no temporal)
      const syncableQueue = queue.filter(item => {
        const idStr = String(item.id_detalle_inspeccion);
        return !idStr.startsWith("temp_");
      });

      if (syncableQueue.length === 0) return;

      setIsSyncing(true);
      console.log(`📶 [AUTO-SYNC] Conexión detectada. Sincronizando ${syncableQueue.length} evidencia(s) fotográfica(s)...`);

      let successCount = 0;

      for (const item of syncableQueue) {
        try {
          // Subir la imagen al backend a través del gateway
          await api.post("/inspecciones/evidencias/upload", {
            id_detalle_inspeccion: item.id_detalle_inspeccion,
            foto_base64: item.foto_base64,
            latitud: item.latitud,
            longitud: item.longitud
          });

          // Eliminar de IndexedDB local una vez confirmada la subida por el servidor
          await db.eliminarEvidenciaPendiente(item.id_temporal);
          successCount++;
          console.log(`✅ [AUTO-SYNC] Foto de evidencia ${item.id_temporal} sincronizada y registrada en Supabase.`);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error(`❌ [AUTO-SYNC] Error subiendo evidencia ${item.id_temporal}:`, errorMsg);
          // Detener bucle si es un error de red global, o continuar si es un error del archivo individual
          if (errorMsg.toLowerCase().includes("network error")) {
            console.warn("⚠️ Interrupción de red. Se pausará la sincronización.");
            break;
          }
        }
      }

      setIsSyncing(false);

      if (successCount > 0) {
        // Disparar evento personalizado en el navegador para que los componentes suscritos recarguen
        const syncEvent = new CustomEvent("offline-sync-complete", {
          detail: { successCount }
        });
        window.dispatchEvent(syncEvent);

        console.log(`🎉 [AUTO-SYNC] Proceso finalizado. ${successCount} fotos sincronizadas.`);
      }
    };

    const handleOnline = () => {
      setOnlineStatus(true);
      processSyncQueue();
    };

    const handleOffline = () => {
      setOnlineStatus(false);
      console.log("📴 [RED] El dispositivo ha entrado en modo Offline (Finca / Campo).");
    };

    // Registrar manejadores de red globales
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Intentar procesar cola al montar si hay conexión
    if (navigator.onLine) {
      processSyncQueue();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isSyncing]);

  return {
    isSyncing,
    isOnline: onlineStatus
  };
}

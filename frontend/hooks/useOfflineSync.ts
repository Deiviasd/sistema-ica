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

      setIsSyncing(true);
      try {
        const db = new OfflineDB();
        let queue: EvidenciaOffline[] = [];
        try {
          queue = await db.obtenerEvidenciasPendientes();
        } catch (err) {
          console.error("Error leyendo cola de IndexedDB:", err);
          return;
        }

        // Filtrar ítems que ya tengan un ID de detalle real (no temporal)
        const syncableQueue = queue.filter(item => {
          const idStr = String(item.id_detalle_inspeccion);
          return !idStr.startsWith("temp_");
        });

        if (syncableQueue.length === 0) return;

        let successCount = 0;

        for (const item of syncableQueue) {
          try {
            await api.post("/inspecciones/evidencias/upload", {
              id_detalle_inspeccion: item.id_detalle_inspeccion,
              foto_base64: item.foto_base64,
              latitud: item.latitud,
              longitud: item.longitud
            });

            await db.eliminarEvidenciaPendiente(item.id_temporal);
            successCount++;
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            console.error(`Error subiendo foto ${item.id_temporal}:`, errorMsg);
            
            if (errorMsg.toLowerCase().includes("network error")) {
              break;
            }
          }
        }

        if (successCount > 0) {
          const syncEvent = new CustomEvent("offline-sync-complete", {
            detail: { successCount }
          });
          window.dispatchEvent(syncEvent);
        }
      } finally {
        setIsSyncing(false);
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

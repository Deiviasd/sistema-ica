import { useEffect, useRef, useState } from "react"
import api from "@/lib/api"
import { EvidenciaOffline, OfflineDB } from "@/lib/offline-db"
import { EvalItem } from "../../types/inspection"
import { EvidencePhoto, ToastType } from "./types"

interface UseEvidenceManagerProps {
  currentEval: EvalItem
  showToast: (message: string, type: ToastType, duration?: number) => void
}

export function useEvidenceManager({ currentEval, showToast }: UseEvidenceManagerProps) {
  const [evidenciasLote, setEvidenciasLote] = useState<EvidencePhoto[]>([])
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true)
  const [isCapturingEvidence, setIsCapturingEvidence] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const loadEvidenciasRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!currentEval.id_lote) return []
      const db = new OfflineDB()
      const offlineTemp = await db.obtenerEvidenciasLocalesPorDetalle(`temp_${currentEval.id_lote}`)
      const offlineDirect = await db.obtenerEvidenciasLocalesPorDetalle(currentEval.id_lote)

      let offlineSaved: EvidenciaOffline[] = []
      if (currentEval.id_detalle) {
        offlineSaved = await db.obtenerEvidenciasLocalesPorDetalle(currentEval.id_detalle)
      }

      const localesMap = [...offlineTemp, ...offlineDirect, ...offlineSaved].map(item => ({
        url: item.foto_base64,
        sincronizado: false,
        id_temporal: item.id_temporal
      }))

      let remotasMap: EvidencePhoto[] = []
      if (currentEval.id_detalle && isOnline) {
        try {
          const res = await api.get(`/inspecciones/evidencias/detalle/${currentEval.id_detalle}`)
          const remotas = res.data || []
          remotasMap = remotas.map((item: { id_evidencia?: number; id_evidencia_inspeccion?: number; id?: number; imagen_url: string }) => ({
            url: item.imagen_url,
            sincronizado: true,
            id_remoto: item.id_evidencia || item.id_evidencia_inspeccion || item.id
          }))
        } catch (err) {
          console.error("Error cargando evidencias remotas:", err)
        }
      }

      return [...localesMap, ...remotasMap]
    }

    loadEvidenciasRef.current = () => {
      load().then(result => setEvidenciasLote(result)).catch(console.error)
    }

    load().then(result => {
      if (!cancelled) setEvidenciasLote(result)
    }).catch(error => {
      if (!cancelled) console.error("Error al cargar evidencias del lote:", error)
    })

    return () => { cancelled = true }
  }, [currentEval.id_lote, currentEval.id_detalle, isOnline])

  useEffect(() => {
    if (typeof window === "undefined") return
    const handleSyncComplete = () => {
      loadEvidenciasRef.current?.()
    }
    window.addEventListener("offline-sync-complete", handleSyncComplete)
    return () => window.removeEventListener("offline-sync-complete", handleSyncComplete)
  }, [])

  const processAndSaveImage = async (file: File) => {
    if (!currentEval.id_lote) {
      showToast("Seleccione un lote antes de tomar fotos.", "error", 3000)
      return
    }

    setIsCapturingEvidence(true)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64Src = e.target?.result as string
        if (!base64Src) throw new Error("No se pudo leer el archivo")

        const img = new Image()
        img.src = base64Src
        img.onload = async () => {
          const maxDim = 1200
          let width = img.width
          let height = img.height

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width)
              width = maxDim
            } else {
              width = Math.round((width * maxDim) / height)
              height = maxDim
            }
          }

          const canvas = document.createElement("canvas")
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext("2d")
          if (!ctx) throw new Error("No se pudo obtener el contexto del canvas")

          ctx.drawImage(img, 0, 0, width, height)
          const compressedBase64 = canvas.toDataURL("image/webp", 0.7)

          let latitud: number | null = null
          let longitud: number | null = null

          if (navigator.geolocation) {
            try {
              const pos = await new Promise<GeolocationPosition>((res, rej) => {
                navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
              })
              latitud = pos.coords.latitude
              longitud = pos.coords.longitude
            } catch (gpsError) {
              console.warn("GPS no disponible o denegado:", gpsError)
            }
          }

          const idTemporal = `evid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          const db = new OfflineDB()
          const idAsociacion = `temp_${currentEval.id_lote}`

          await db.guardarEvidenciaPendiente({
            id_temporal: idTemporal,
            id_detalle_inspeccion: idAsociacion,
            foto_base64: compressedBase64,
            latitud,
            longitud,
            fecha_creacion: new Date().toISOString()
          })

          showToast("Foto guardada localmente", "success", 2000)
          loadEvidenciasRef.current?.()
          setIsCapturingEvidence(false)
        }
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error("Error procesando imagen:", err)
      showToast("Error al procesar la imagen.", "error", 3000)
      setIsCapturingEvidence(false)
    }
  }

  const handleRemoveEvidenceLocal = async (idTemporal: string) => {
    try {
      const db = new OfflineDB()
      await db.eliminarEvidenciaPendiente(idTemporal)
      showToast("Evidencia eliminada", "success", 2000)
      loadEvidenciasRef.current?.()
    } catch (err) {
      console.error("Error eliminando evidencia local:", err)
    }
  }

  const handleRemoveEvidence = async (photo: EvidencePhoto) => {
    try {
      if (photo.id_temporal) {
        // Local evidence, delete from offline DB
        await handleRemoveEvidenceLocal(photo.id_temporal);
      } else if (photo.id_remoto && isOnline) {
        // Remote evidence, delete via API
        await api.delete(`/inspecciones/evidencias/${photo.id_remoto}`);
        showToast("Evidencia remota eliminada", "success", 2000);
        // Refresh list
        loadEvidenciasRef.current?.();
      } else {
        showToast("No se puede eliminar la evidencia", "error", 3000);
      }
    } catch (err) {
      console.error("Error al eliminar evidencia:", err);
      showToast("Error al eliminar evidencia", "error", 3000);
    }
  };

  return {
    evidenciasLote,
    isOnline,
    isCapturingEvidence,
    fileInputRef,
    processAndSaveImage,
    handleRemoveEvidenceLocal,
    handleRemoveEvidence
  }
}

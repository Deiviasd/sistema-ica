import { Dispatch, RefObject, SetStateAction, useEffect, useRef, useState } from "react"
import { Bug, Camera, Check, ChevronDown, Eye, ImagePlus, Loader2, Sprout, Wifi, WifiOff, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EvalItem, Lote, Plaga } from "../../types/inspection"
import { EvidencePhoto, ToastType } from "./types"
import { getVariedadNombre } from "./utils"

interface SaveResult {
  success: boolean
  error?: string
  isUnchanged?: boolean
}

interface EvaluationFormProps {
  currentEval: EvalItem
  plagaPersonalizada: string
  setPlagaPersonalizada: Dispatch<SetStateAction<string>>
  catalogPlagas: Plaga[]
  loadingPlagas: boolean
  calculateInfestation: () => number
  handleUpdateCurrentEval: (updates: Partial<EvalItem>) => void
  isOnline: boolean
  fileInputRef: RefObject<HTMLInputElement | null>
  isCapturingEvidence: boolean
  processAndSaveImage: (file: File) => void
  evidenciasLote: EvidencePhoto[]
  handleRemoveEvidence: (photo: EvidencePhoto) => void
  activeLotes: Lote[]
  handleSaveLoteEvaluation: (activeLotes: Lote[]) => Promise<SaveResult>
  showToast: (message: string, type: ToastType, duration?: number) => void
  onConfirmManualPlaga: (nombre: string) => Promise<void>
}

export function EvaluationForm({
  currentEval,
  plagaPersonalizada,
  setPlagaPersonalizada,
  catalogPlagas,
  loadingPlagas,
  calculateInfestation,
  handleUpdateCurrentEval,
  isOnline,
  fileInputRef,
  isCapturingEvidence,
  processAndSaveImage,
  evidenciasLote,
  handleRemoveEvidence,
  activeLotes,
  handleSaveLoteEvaluation,
  showToast,
  onConfirmManualPlaga
}: EvaluationFormProps) {
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState("")
  const [previewImage, setPreviewImage] = useState<{ title: string; subtitle?: string; url: string } | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const selectedPlagaData = catalogPlagas.find(p => p.nombre_comun === currentEval.plaga)

  const [isSaving, setIsSaving] = useState(false)

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    setCameraOpen(false)
    setCameraError("")
  }

  const openCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast("La cámara no está disponible en este navegador.", "error", 3000)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      })
      streamRef.current = stream
      setCameraOpen(true)
      setCameraError("")
    } catch (error) {
      console.error("Error abriendo cámara:", error)
      setCameraError("No se pudo acceder a la cámara. Revisa permisos del navegador.")
      showToast("No se pudo acceder a la cámara.", "error", 3000)
    }
  }

  const captureCameraPhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], `captura_${Date.now()}.jpg`, { type: "image/jpeg" })
      processAndSaveImage(file)
      closeCamera()
    }, "image/jpeg", 0.9)
  }

  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(console.error)
    }
  }, [cameraOpen])

  useEffect(() => closeCamera, [])
  return (
    <Card className="bg-card border-border rounded-[3rem] overflow-hidden">
      <CardContent className="p-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">CULTIVO EVALUADO</label>
            {currentEval.siembra ? (
              <div
                className="relative w-full rounded-2xl overflow-hidden border border-slate-800/80 h-[76px] flex items-center p-5 bg-slate-900/40 hover:border-muted-foreground/30 transition-colors"
                style={{ backgroundImage: currentEval.siembra.imagen_url ? `url(${currentEval.siembra.imagen_url})` : "none" }}
              >
                {currentEval.siembra.imagen_url && <div className="absolute inset-0 bg-slate-950/80 z-0" />}
                <div className="relative z-10 flex items-center gap-4 w-full">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 backdrop-blur-md flex items-center justify-center border border-emerald-500/30">
                    <Sprout className="text-emerald-400 w-4.5 h-4.5 flex-shrink-0" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-black italic uppercase tracking-tight leading-tight">{currentEval.siembra.especie}</p>
                    <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mt-0.5">{getVariedadNombre(currentEval.siembra)}</p>
                  </div>
                  <Button
                    type="button"
                    disabled={!currentEval.siembra.imagen_url}
                    onClick={() => currentEval.siembra?.imagen_url && setPreviewImage({
                      title: currentEval.siembra.especie || "Cultivo",
                      subtitle: getVariedadNombre(currentEval.siembra),
                      url: currentEval.siembra.imagen_url
                    })}
                    className="h-9 shrink-0 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 text-[10px] font-black uppercase tracking-wider text-emerald-400 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900/60 disabled:text-slate-600"
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> Foto
                  </Button>
                </div>
              </div>
            ) : (
              <div className="w-full bg-muted border border-border rounded-2xl p-5 text-muted-foreground font-bold italic text-sm h-[76px] flex items-center justify-center">
                Selecciona un lote arriba para ver el cultivo
              </div>
            )}
          </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">PLAGA DETECTADA</label>
              {currentEval.plaga && !catalogPlagas.find(p => p.nombre_comun === currentEval.plaga) && plagaPersonalizada === "" ? (
                <div className="group relative h-[76px] rounded-2xl border border-emerald-500/30 bg-emerald-500/10 flex items-center px-5 gap-4">
                  <Bug className="text-emerald-400 w-5 h-5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white uppercase truncate">{currentEval.plaga}</p>
                    <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mt-0.5">Plaga manual registrada</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPlagaPersonalizada(" ")
                      handleUpdateCurrentEval({ plaga: "" })
                    }}
                    className="h-9 shrink-0 rounded-xl border border-slate-700 bg-slate-900 px-4 text-[10px] font-black uppercase tracking-wider text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <div className="group relative h-[76px] rounded-2xl border border-slate-800/80 bg-slate-900/40 hover:border-muted-foreground/30 transition-colors">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center pointer-events-none z-10">
                    {loadingPlagas ? <Loader2 className="text-teal-500 w-4 h-4 animate-spin" /> : <Bug className="text-slate-500 w-4 h-4" />}
                  </div>
                  <select
                    className="absolute inset-0 w-full h-full bg-transparent pl-14 pr-36 text-foreground text-sm font-black outline-none appearance-none cursor-pointer disabled:opacity-50 truncate"
                    disabled={loadingPlagas || !currentEval.siembra}
                    value={plagaPersonalizada ? "__otra__" : currentEval.plaga}
                    onChange={(e) => {
                      if (e.target.value === "__otra__") {
                        setPlagaPersonalizada(" ")
                        handleUpdateCurrentEval({ plaga: "" })
                      } else {
                        setPlagaPersonalizada("")
                        handleUpdateCurrentEval({ plaga: e.target.value })
                      }
                    }}
                  >
                    <option className="bg-slate-950 text-slate-100" value="">{loadingPlagas ? "Consultando catálogo..." : "-- Sin hallazgos --"}</option>
                    {catalogPlagas.map((p: Plaga) => (
                      <option className="bg-slate-950 text-slate-100" key={p.id_plaga} value={p.nombre_comun}>
                        {p.nombre_comun} {p.nombre_cientifico ? `(${p.nombre_cientifico})` : ""}
                      </option>
                    ))}
                    <option className="bg-slate-950 text-slate-100" value="__otra__"> Registrar nueva plaga manual...</option>
                  </select>
                  {currentEval.plaga && plagaPersonalizada === "" && (
                    <span className="pointer-events-none absolute left-10 top-full z-40 mt-1 max-w-[320px] rounded-lg border border-rose-500/30 bg-slate-950 px-3 py-2 text-[11px] font-bold normal-case leading-snug text-white opacity-0 shadow-2xl shadow-slate-950/60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 group-active:opacity-100">
                      {currentEval.plaga}
                    </span>
                  )}
                  <div className="absolute right-28 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <ChevronDown className="w-5 h-5" />
                  </div>
                  <Button
                    type="button"
                    disabled={!selectedPlagaData?.imagen_url}
                    onClick={() => selectedPlagaData?.imagen_url && setPreviewImage({
                      title: selectedPlagaData.nombre_comun,
                      subtitle: selectedPlagaData.nombre_cientifico,
                      url: selectedPlagaData.imagen_url
                    })}
                    className="absolute right-4 top-1/2 z-20 h-9 -translate-y-1/2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 text-[10px] font-black uppercase tracking-wider text-rose-300 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900/60 disabled:text-slate-600"
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> Foto
                  </Button>
                </div>
              )}
              {plagaPersonalizada !== "" && (
              <div className="mt-2 p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">NUEVA PLAGA MANUAL</p>
                <input
                  type="text"
                  className="w-full bg-slate-900/60 border-2 border-emerald-500/40 rounded-xl py-3 px-4 text-foreground font-bold outline-none focus:border-emerald-500 transition-all placeholder:text-slate-500"
                  placeholder="Escribe el nombre de la plaga detectada..."
                  value={plagaPersonalizada === " " ? "" : plagaPersonalizada}
                  onChange={(e) => {
                    setPlagaPersonalizada(e.target.value)
                    handleUpdateCurrentEval({ plaga: e.target.value })
                  }}
                />
                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPlagaPersonalizada("")
                      handleUpdateCurrentEval({ plaga: "" })
                    }}
                    className="flex-1 h-9 rounded-xl border border-slate-700 bg-slate-900 text-xs font-black uppercase tracking-wider text-slate-400 hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={plagaPersonalizada.trim() === "" || plagaPersonalizada === " "}
                    onClick={async () => {
                      const nombre = plagaPersonalizada.trim()
                      if (nombre) {
                        await onConfirmManualPlaga(nombre)
                        setPlagaPersonalizada("")
                        handleUpdateCurrentEval({ plaga: nombre })
                      }
                    }}
                    className="flex-1 h-9 rounded-xl bg-emerald-600 text-xs font-black uppercase tracking-wider text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Confirmar Plaga
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 font-bold mt-1.5 ml-1">Luego presiona &quot;Confirmar Evaluación del Lote&quot; para guardar todo</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">TOTAL PLANTAS EN EL LOTE</label>
            <div className="w-full min-h-[76px] bg-slate-900/40 border border-slate-800/80 rounded-2xl py-4 px-6 flex items-center justify-between gap-4">
              <span className="text-slate-400 font-bold italic text-sm">
                {currentEval.totales ? `${currentEval.totales} plantas registradas (Lectura)` : "Selecciona un lote"}
              </span>
              <span className="text-foreground font-black text-lg bg-muted/60 px-5 py-2 rounded-xl border border-border select-none">
                {currentEval.totales || 0}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">PLANTAS AFECTADAS</label>
            <div className="relative flex items-center w-full min-h-[76px] bg-slate-900/40 border border-slate-800/80 rounded-2xl px-2">
              <button
                type="button"
                onClick={() => {
                  const current = Number(currentEval.afectadas) || 0
                  if (current > 0) handleUpdateCurrentEval({ afectadas: current - 1 })
                }}
                disabled={!currentEval.siembra}
                className="absolute left-3 bg-background hover:bg-muted border border-border text-foreground font-black w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 select-none text-xl"
              >
                -
              </button>
              <input
                type="number"
                disabled={!currentEval.siembra}
                className="w-full h-full bg-transparent border-0 rounded-2xl py-4 px-14 text-center text-foreground text-lg font-black outline-none transition-all placeholder:text-muted-foreground"
                placeholder={currentEval.siembra ? "0" : "Selecciona un lote"}
                value={currentEval.afectadas || ""}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  const maxVal = currentEval.totales || Infinity
                  const cappedVal = Math.min(Math.max(0, val), maxVal)
                  handleUpdateCurrentEval({ afectadas: cappedVal })
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const current = Number(currentEval.afectadas) || 0
                  const maxVal = currentEval.totales || Infinity
                  if (current < maxVal) handleUpdateCurrentEval({ afectadas: current + 1 })
                }}
                disabled={!currentEval.siembra}
                className="absolute right-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 select-none text-xl shadow-lg shadow-emerald-950/40"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="bg-emerald-600/5 border border-emerald-500/20 p-6 rounded-2xl flex items-center justify-between">
          <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest italic">% Infestación calculado:</span>
          <p className={`text-4xl font-black italic tracking-tighter ${calculateInfestation() > 20 ? "text-rose-500" : "text-emerald-500"}`}>
            {calculateInfestation().toFixed(1)}%
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">RECOMENDACIÓN DE MANEJO</label>
          <textarea
            className="w-full bg-muted/30 border border-border rounded-2xl py-4 px-6 text-foreground font-medium outline-none transition-all focus:border-teal-500/50 min-h-[80px]"
            placeholder="Escribe la recomendación de manejo..."
            value={currentEval.recomendacion}
            onChange={(e) => handleUpdateCurrentEval({ recomendacion: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">OBSERVACIONES ESPECÍFICAS</label>
          <textarea
            className="w-full bg-muted/30 border border-border rounded-2xl py-4 px-6 text-foreground font-medium outline-none transition-all focus:border-teal-500/50 min-h-[120px]"
            placeholder="Escribe observaciones específicas sobre este lote..."
            value={currentEval.nota}
            onChange={(e) => handleUpdateCurrentEval({ nota: e.target.value })}
          />
        </div>

        {currentEval.id_lote ? (
          <div className="space-y-4 pt-6 border-t border-slate-800/60">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">EVIDENCIAS FOTOGRÁFICAS</label>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-2">
                {isOnline ? (
                  <span className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    <Wifi className="w-3 h-3" /> Auto-Sync Activo
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                    <WifiOff className="w-3 h-3" /> Offline (Modo Campo)
                  </span>
                )}
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) processAndSaveImage(e.target.files[0])
                e.target.value = ""
              }}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                type="button"
                disabled={isCapturingEvidence}
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute("capture")
                    fileInputRef.current.click()
                  }
                }}
                className="h-14 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-teal-400 font-bold uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-3 shadow-inner"
              >
                <ImagePlus className="w-5 h-5" />
                Subir Imagen
              </Button>
              <Button
                type="button"
                disabled={isCapturingEvidence}
                onClick={() => {
                  openCamera()
                }}
                className="h-14 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-teal-400 font-bold uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-3 shadow-inner"
              >
                {isCapturingEvidence ? <Loader2 className="w-5 h-5 animate-spin text-teal-400" /> : <Camera className="w-5 h-5" />}
                Usar Cámara
              </Button>
            </div>

              {evidenciasLote.filter(f => f.url).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 p-6 bg-slate-950/40 rounded-3xl border border-slate-900">
                  {evidenciasLote.filter(f => f.url).map((foto, idx) => (
                    <div 
                      key={foto.id_temporal || idx} 
                      className={`relative aspect-square rounded-3xl overflow-hidden border-4 group bg-slate-900 flex items-center justify-center shadow-lg transition-colors duration-300 cursor-pointer ${
                        foto.sincronizado 
                          ? "border-emerald-500/40 hover:border-emerald-500" 
                          : isOnline 
                            ? "border-indigo-500/40 hover:border-indigo-500"
                            : "border-amber-500/40 hover:border-amber-500"
                      }`}
                      onClick={() => foto.url && setPreviewImage({ title: `Evidencia Fotográfica ${idx + 1}`, url: foto.url })}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={foto.url!} 
                        alt={`Evidencia ${idx + 1}`} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 group-hover:blur-sm group-hover:brightness-50" 
                      />
                      
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveEvidence(foto); }}
                        className="absolute top-3 right-3 p-2.5 bg-rose-600/90 text-white rounded-full hover:bg-rose-500 transition-transform hover:scale-110 z-20 shadow-xl"
                      >
                        <X className="w-5 h-5" />
                      </button>

                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                        {foto.sincronizado ? (
                          <>
                            <Check className="w-8 h-8 text-white drop-shadow-md" />
                            <span className="text-white font-black uppercase tracking-widest text-xs drop-shadow-md">Cargada</span>
                          </>
                        ) : isOnline ? (
                          <>
                            <Wifi className="w-8 h-8 text-white animate-pulse drop-shadow-md" />
                            <span className="text-white font-black uppercase tracking-widest text-xs drop-shadow-md">En cola</span>
                          </>
                        ) : (
                          <>
                            <WifiOff className="w-8 h-8 text-amber-400 drop-shadow-md" />
                            <span className="text-amber-400 font-black uppercase tracking-widest text-xs drop-shadow-md">Offline</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
            ) : (
              <div className="text-center p-10 border border-dashed border-slate-800 rounded-3xl text-slate-500 text-sm italic">
                No se han capturado evidencias fotográficas para este lote.
              </div>
            )}
          </div>
        ) : (
          <div className="text-center p-8 border border-dashed border-slate-800 rounded-[2rem] text-slate-500 text-xs italic">
            Seleccione un lote de la lista para registrar evidencias fotográficas de la inspección.
          </div>
        )}

        {currentEval.id_lote && (
          <div className="pt-6 border-t border-slate-800/60 flex justify-end">
            <Button
              type="button"
              disabled={isSaving}
              onClick={async () => {
                if (isSaving) return
                setIsSaving(true)
                try {
                  const res = await handleSaveLoteEvaluation(activeLotes)
                  if (!res.success) {
                    showToast(res.error || "Error al guardar", "error", 3000)
                    return
                  }
                  showToast(res.isUnchanged ? "Lote sin cambios, pasando al siguiente" : "Inspección del lote registrada", "success", 2000)
                } catch (err) {
                  console.error("Error saving evaluation:", err)
                  showToast("Error inesperado al guardar", "error", 3000)
                } finally {
                  setIsSaving(false)
                }
              }}
              className="h-12 px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-black italic rounded-xl transition-all uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-950/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {isSaving ? "Guardando..." : "Confirmar Evaluación del Lote"}
            </Button>
          </div>
        )}
      </CardContent>
      {previewImage && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-4xl overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 p-5">
              <div className="min-w-0">
                <h3 className="mt-1 truncate text-xl font-black uppercase italic text-white">{previewImage.title}</h3>
                {previewImage.subtitle && <p className="mt-1 text-sm font-bold italic text-slate-400">{previewImage.subtitle}</p>}
              </div>
              <Button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="h-10 w-10 shrink-0 rounded-full bg-slate-900 p-0 text-slate-300 hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="bg-slate-900 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewImage.url} alt={previewImage.title} className="max-h-[70vh] w-full rounded-2xl object-contain" />
            </div>
          </div>
        </div>
      )}
      {cameraOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-3xl rounded-[2rem] border border-slate-800 bg-slate-950 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400">Cámara</p>
                <p className="mt-1 text-sm font-bold text-slate-400">Toma una foto con la cámara del equipo.</p>
              </div>
              <Button
                type="button"
                onClick={closeCamera}
                className="h-10 w-10 rounded-full bg-slate-900 p-0 text-slate-300 hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              <video ref={videoRef} className="max-h-[60vh] w-full bg-black object-contain" playsInline muted autoPlay />
            </div>
            <canvas ref={canvasRef} className="hidden" />

            {cameraError && <p className="mt-3 text-sm font-bold text-rose-400">{cameraError}</p>}

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                type="button"
                onClick={closeCamera}
                className="h-12 rounded-2xl border border-slate-800 bg-slate-900 font-black uppercase tracking-wider text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={captureCameraPhoto}
                className="h-12 rounded-2xl bg-emerald-600 font-black uppercase tracking-wider text-white hover:bg-emerald-500"
              >
                <Camera className="mr-2 h-5 w-5" /> Capturar Foto
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

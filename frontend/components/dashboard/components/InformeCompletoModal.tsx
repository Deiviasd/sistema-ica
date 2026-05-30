import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { MapPin, ChevronRight, X, FileText, UserCheck, ClipboardList, Leaf, Bug, Image as ImageIcon } from "lucide-react"
import { Loader2 } from "lucide-react"
import api from "@/lib/api"
import { Inspection, FormData, ContextoInspeccion, LugarProduccion, Lote, EvalItem, HallazgoPrevio, SiembraActiva } from "../types/inspection"

interface Props {
  inspection: Inspection
  liveFormData?: FormData
  onClose: () => void
  filterPredioId?: string | null
  filterLoteId?: string | null
}

function TruncatedValue({ value, tone = "white" }: { value: string; tone?: "white" | "emerald" }) {
  const needsTooltip = value.length > 14
  const textClass = tone === "emerald" ? "text-emerald-400" : "text-foreground"

  if (!needsTooltip) {
    return <p className={`text-[13px] font-black uppercase leading-tight ${textClass}`}>{value}</p>
  }

  return (
    <button
      type="button"
      className="group relative block w-full text-left focus:outline-none"
      aria-label={`Ver valor completo: ${value}`}
      onClick={(e) => e.stopPropagation()}
    >
      <span className={`block truncate text-[13px] font-black uppercase leading-tight ${textClass}`}>{value}</span>
      <span className="pointer-events-none absolute left-0 top-full z-30 mt-2 max-w-[260px] rounded-lg border border-emerald-500/30 bg-popover px-3 py-2 text-[11px] font-bold normal-case leading-snug text-popover-foreground opacity-0 shadow-2xl transition-opacity group-hover:opacity-100 group-focus:opacity-100 group-active:opacity-100">
        {value}
      </span>
    </button>
  )
}

export function InformeCompletoModal({ inspection, liveFormData, onClose, filterPredioId, filterLoteId }: Props) {
  const [context, setContext] = useState<ContextoInspeccion | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDossierLugar, setSelectedDossierLugar] = useState<string | null>(null)
  const [selectedDossierLote, setSelectedDossierLote] = useState<string | number | null>(null)
  const [showPredios, setShowPredios] = useState(false)
  const [evidenciasPorDetalle, setEvidenciasPorDetalle] = useState<Record<string, { imagen_url: string; fecha_creacion?: string }[]>>({})
  const [loadingEvidencias, setLoadingEvidencias] = useState<Record<string, boolean>>({})
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null)

  const getVariedadNombre = (siembra?: SiembraActiva | null) => {
    if (!siembra?.variedad) return siembra?.variedad_nombre || 'Genérica'
    return typeof siembra.variedad === 'string' ? siembra.variedad : siembra.variedad.nombre_variedad || 'Genérica'
  }

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const res = await api.get(`/inspecciones/${inspection.id_inspeccion}/contexto`)
        setContext(res.data)
      } catch (err) {
        console.error("Error al cargar contexto:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchContext()
  }, [inspection])

  useEffect(() => {
    // Bloquear el scroll del cuerpo de la página mientras el modal está abierto
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  const groupedEvals = useMemo(() => {
    const evals = liveFormData
      ? liveFormData.evaluations
      : (context?.hallazgos_previos?.map((hp: HallazgoPrevio) => {
        const obs = hp.observaciones_especificas || "";
        return {
          id_detalle: hp.id_detalle,
          id_lote: String(hp.id_lote || hp.siembra_id || ""),
          siembra: { id_siembra: hp.siembra_id || 0 },
          afectadas: hp.cantidad_plantas_afectadas || 0,
          totales: hp.plantas_totales || hp.cantidad_plantas_afectadas || 0,
          porcentaje: hp.porcentaje_infestacion || 0,
          plaga: obs.match(/\[Plaga:(.+?)\]/)?.[1]?.trim() || hp.plaga || "Plaga guardada",
          recomendacion: obs.match(/\[Recomendacion:(.+?)\]/)?.[1]?.trim() || "N/A",
          nota: obs.split('] | ').pop() || ""
        };
      }) || [])

    const groups: Record<string, Record<string, EvalItem[]>> = {}
    evals.forEach((ev: EvalItem) => {
      let targetLugar: LugarProduccion | null = null
      let targetLote: Lote | null = null
      
      for (const lugar of (context?.lugares_produccion || [])) {
        let found = false
        // Check lotes inside predios first to ensure we get the id_predio mapping
        if (lugar.predios) {
          for (const predio of lugar.predios) {
            if (predio.lotes) {
              for (const lote of predio.lotes) {
                if (String(ev.id_lote) === String(lote.id_lote) || (ev.siembra && Number(ev.siembra.id_siembra) === Number(lote.siembra_activa?.id_siembra))) {
                  targetLugar = lugar
                  targetLote = { ...lote, id_predio: predio.id_predio } as any
                  found = true
                  break
                }
              }
            }
            if (found) break
          }
        }
        // Check top-level lotes in lugar as fallback
        if (!found && lugar.lotes) {
          for (const lote of lugar.lotes) {
            if (String(ev.id_lote) === String(lote.id_lote) || (ev.siembra && Number(ev.siembra.id_siembra) === Number(lote.siembra_activa?.id_siembra))) {
              targetLugar = lugar
              targetLote = lote
              found = true
              break
            }
          }
        }
        if (found) break
      }

      // Filter by Predio prop
      if (filterPredioId && filterPredioId !== "all") {
        if (String((targetLote as any)?.id_predio) !== String(filterPredioId)) {
          return // skip this eval!
        }
      }

      // Filter by Lote prop
      if (filterLoteId && filterLoteId !== "all") {
        if (String(targetLote?.id_lote) !== String(filterLoteId)) {
          return // skip this eval!
        }
      }

      const lugarKey = targetLugar ? targetLugar.nombre_lugar : 'Sin Lugar Identificado'
      const siembra = targetLote ? targetLote.siembra_activa : null
      const siembraDetail = siembra
        ? ` (Especie: ${siembra.especie || 'N/A'} · Variedad: ${getVariedadNombre(siembra)})`
        : ' (Sin Siembra Activa)'
      const loteKey = targetLote
        ? `${targetLote.nombre_lote}${siembraDetail}`
        : 'Sin Lote Identificado'
      if (!groups[lugarKey]) groups[lugarKey] = {}
      if (!groups[lugarKey][loteKey]) groups[lugarKey][loteKey] = []
      groups[lugarKey][loteKey].push(ev)
    })
    return groups
  }, [liveFormData, context?.hallazgos_previos, context?.lugares_produccion, filterPredioId, filterLoteId])

  const lugarInspeccion = context?.lugares_produccion?.find(
    (l) => l.id_lugar_produccion === context?.id_lugar_produccion
  ) || context?.lugares_produccion?.[0];

  const prediosDelLugar = useMemo(() => {
    let list = lugarInspeccion?.predios || []
    if (filterPredioId && filterPredioId !== "all") {
      list = list.filter(p => String(p.id_predio) === String(filterPredioId))
    }
    return list
  }, [lugarInspeccion, filterPredioId])

  if (loading) return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md">
      <Loader2 className="w-12 h-12 text-teal-500 animate-spin" />
    </div>
  )

  const genObs = liveFormData ? liveFormData.generalObs : inspection.observaciones_generales

  const fetchEvidenciasDetalle = async (idDetalle: number, rowId: string) => {
    if (evidenciasPorDetalle[rowId] || loadingEvidencias[rowId]) return
    setLoadingEvidencias(prev => ({ ...prev, [rowId]: true }))
    try {
      const res = await api.get(`/inspecciones/evidencias/detalle/${idDetalle}`)
      setEvidenciasPorDetalle(prev => ({ ...prev, [rowId]: res.data || [] }))
    } catch (err) {
      console.error("Error cargando evidencias del informe:", err)
    } finally {
      setLoadingEvidencias(prev => ({ ...prev, [rowId]: false }))
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl bg-card border border-teal-500/20 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] transition-colors"
      >
        {/* Header */}
        <div className="bg-card border-b border-border p-5 flex items-center justify-between shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 blur-[85px] rounded-full -mr-20 -mt-20" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center border border-teal-500/25">
              <FileText className="text-teal-400 w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground italic uppercase tracking-tighter leading-none">Informe Técnico</h2>
              <p className="text-teal-400 font-bold text-[10px] uppercase tracking-[0.25em] mt-1.5">
                Inspección {inspection.estado === 'finalizada' ? 'Finalizada' : 'En Proceso'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="relative z-10 w-10 h-10 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center text-foreground transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scroll body */}
        <div className={`flex-1 p-6 space-y-6 custom-scrollbar ${previewImage ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {/* Productor / Lugar */}
          {/* Info General — basado en secciones I y II del informe ICA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted/50 p-4 rounded-xl border border-border relative overflow-hidden">
              <UserCheck className="absolute -right-4 -bottom-4 w-20 h-20 text-muted-foreground/10" />
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5 relative z-10">Titular de la Empresa</p>
              <p className="text-base font-black text-foreground relative z-10">{context?.productor?.nombre}</p>
              <p className="text-xs text-muted-foreground relative z-10 mt-0.5">{context?.productor?.ubicacion}</p>
            </div>
            <div className="bg-muted/50 p-4 rounded-xl border border-border relative overflow-hidden">
              <MapPin className="absolute -right-4 -bottom-4 w-20 h-20 text-muted-foreground/10" />
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5 relative z-10">Lugar de Producción</p>
              <p className="text-base font-black text-foreground relative z-10">{context?.lugar_nombre || 'Sin registrar'}</p>
              <p className="text-xs text-muted-foreground relative z-10 mt-0.5">{context?.area_lugar} Ha · Área Operativa</p>
            </div>
            {/* Técnico asignado + Predios — sección II del informe ICA */}
            <div className="md:col-span-2 space-y-2">
              {/* Fila: N° Registro ICA | Técnico Asignado | Fecha Reporte | Predios (collapsible) */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'N° Registro ICA', value: context?.lugares_produccion?.find((l) => l.es_lugar_inspeccion)?.numero_registro || context?.lugares_produccion?.[0]?.numero_registro || 'Pendiente' },
                  { label: 'Técnico Asignado', value: inspection.tecnico_nombre || context?.tecnico_nombre || 'No asignado' },
                  { 
                    label: 'Fecha Reporte', 
                    value: (() => {
                      if (!inspection.fecha_programada) return 'Sin fecha'
                      const dateOnly = inspection.fecha_programada.split('T')[0]
                      const parts = dateOnly.split('-')
                      if (parts.length === 3) {
                        const year = parseInt(parts[0], 10)
                        const month = parseInt(parts[1], 10) - 1
                        const day = parseInt(parts[2], 10)
                        return new Date(year, month, day).toLocaleDateString("es-ES", {
                          year: "numeric",
                          month: "long",
                          day: "numeric"
                        })
                      }
                      return new Date(inspection.fecha_programada).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                      })
                    })()
                  }
                ].map(({ label, value }) => (
                  <div key={label} className="bg-muted/30 border border-border rounded-xl p-3.5">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">{label}</p>
                    <p className="text-xs font-black text-foreground italic truncate" title={value}>{value}</p>
                  </div>
                ))}
 
                {/* Predios — botón desplegable */}
                <button
                  type="button"
                  onClick={() => setShowPredios(open => !open)}
                  className={`bg-muted/30 border rounded-xl p-3.5 text-left flex items-start justify-between gap-2 hover:bg-muted transition-colors ${showPredios ? 'border-emerald-500/40' : 'border-border'
                    }`}
                >
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">Predios del Lugar</p>
                    <p className="text-xs font-black text-foreground italic">
                      {prediosDelLugar.length > 0
                        ? `${prediosDelLugar.length} predio${prediosDelLugar.length === 1 ? '' : 's'}`
                        : 'Sin predios'}
                    </p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-emerald-400 transition-transform shrink-0 mt-0.5 ${showPredios ? 'rotate-90' : ''}`} />
                </button>
              </div>

              {/* Panel desplegable de predios — expande DEBAJO de la fila */}
              {showPredios && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-background/80 border border-emerald-500/20 rounded-xl p-3 space-y-2 overflow-hidden"
                >
                  {prediosDelLugar.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-2">No hay predios registrados.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {prediosDelLugar.map((p) => (
                        <div key={p.id_predio} className="rounded-lg border border-border bg-card/60 p-3">
                          <p className="text-sm font-black text-foreground uppercase tracking-wide leading-tight">{p.nombre_predio}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            <span className="font-bold text-muted-foreground/70">N° Predial: </span>
                            {p.numero_predial || 'N/A'}
                          </p>
                          <p className="text-sm font-black text-emerald-400 mt-1.5">
                            {p.area_hectareas || 0} <span className="text-xs font-bold text-muted-foreground">Ha</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
          {/* Lotes por Predio */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-emerald-400 uppercase tracking-[0.4em] flex items-center gap-2">
              <ClipboardList className="w-3.5 h-3.5" /> Lotes Inspeccionados
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
              {(() => {
                const predios = context?.lugares_produccion?.flatMap((l) => l.predios || []) || []
                const todosLotes = predios.flatMap((p) =>
                  (p.lotes || []).map((lote) => ({ ...lote, predio_nombre: p.nombre_predio, id_predio: p.id_predio }))
                )
                
                let filteredTodosLotes = todosLotes;
                if (filterPredioId && filterPredioId !== "all") {
                  filteredTodosLotes = filteredTodosLotes.filter(l => String(l.id_predio) === String(filterPredioId))
                }
                if (filterLoteId && filterLoteId !== "all") {
                  filteredTodosLotes = filteredTodosLotes.filter(l => String(l.id_lote) === String(filterLoteId))
                }

                if (filteredTodosLotes.length === 0) return (
                  <p className="col-span-full text-muted-foreground italic text-sm text-center py-4 bg-card/50 border border-border rounded-xl">
                    No hay lotes registrados para el filtro seleccionado.
                  </p>
                )
                return filteredTodosLotes.map((lote) => {
                  const isOpen = selectedDossierLote === lote.id_lote

                  return (
                    <div key={lote.id_lote} className={`self-start rounded-xl border transition-all overflow-hidden ${isOpen ? 'bg-emerald-600/5 border-emerald-500/30' : 'bg-card border-border/80 hover:border-muted-foreground/40'
                      }`}>
                      <div onClick={() => setSelectedDossierLote(isOpen ? null : lote.id_lote)} className="flex items-center gap-3 p-3 cursor-pointer">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${lote.siembra_activa ? 'bg-emerald-500/10' : 'bg-muted'}`}>
                          <Leaf className={`w-4.5 h-4.5 ${lote.siembra_activa ? 'text-emerald-500' : 'text-muted-foreground/70'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-foreground italic uppercase tracking-tight truncate">{lote.nombre_lote}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[9px] text-muted-foreground font-bold uppercase">{lote.predio_nombre}</span>
                            <span className="text-muted-foreground/70">·</span>
                            <span className="text-[9px] text-muted-foreground font-bold">{lote.area} m²</span>
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${lote.siembra_activa
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-muted text-muted-foreground border border-border'
                              }`}>
                              {lote.siembra_activa?.especie ?? 'Sin siembra'}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 text-muted-foreground/70 transition-transform flex-shrink-0 ${isOpen ? 'rotate-90 text-emerald-500' : ''}`} />
                      </div>

                      {isOpen && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="border-t border-emerald-500/20 bg-background/50">
                          {lote.siembra_activa ? (
                            <div className="p-3 grid grid-cols-3 gap-3">
                              {[
                                { label: 'Especie', value: lote.siembra_activa.especie || 'N/A' },
                                { label: 'Variedad', value: getVariedadNombre(lote.siembra_activa) },
                                { label: 'Ciclo', value: lote.siembra_activa.ciclo || 'N/A', isBadge: true },
                                { label: 'Fecha Siembra', value: lote.siembra_activa.fecha_siembra ? new Date(lote.siembra_activa.fecha_siembra).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A' },
                                { label: 'Censo', value: lote.siembra_activa.cantidad_plantas ? `${lote.siembra_activa.cantidad_plantas} plantas` : '0 plantas', isGreen: true },
                                { label: 'Área', value: `${lote.area} m²` },
                              ].map(({ label, value, isBadge, isGreen }) => (
                                <div key={label} className="min-w-0">
                                  <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest mb-0.5">{label}</p>
                                  {isBadge ? (
                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase block w-fit ${value === 'ANUAL' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>{value}</span>
                                  ) : (
                                    <p className={`text-xs font-bold italic truncate ${isGreen ? 'text-emerald-400' : 'text-foreground'}`}>{value}</p>
                                  )}
                                </div>
                              ))}
                              {lote.siembra_activa.edad_dias && (
                                <div className="col-span-full bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2.5 flex items-center justify-between">
                                  <p className="text-[8px] text-emerald-500 font-black uppercase tracking-widest">Edad del Cultivo</p>
                                  <p className="text-sm text-foreground font-black italic">{lote.siembra_activa.edad_dias} <span className="text-emerald-500 text-xs font-normal">días en campo</span></p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-3 text-center">
                              <p className="text-muted-foreground italic text-[11px]">Sin siembra activa registrada.</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  )
                })
              })()}
            </div>
          </div>
          {/* Observaciones generales */}
          <div className="bg-card p-4 rounded-xl border border-border">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2.5 flex items-center gap-2">
              <ClipboardList className="w-3.5 h-3.5 text-emerald-500" /> Observaciones Generales
            </p>
            <p className="text-xs text-muted-foreground italic bg-background p-3 rounded-lg border border-border">
              {genObs || "Sin observaciones generales registradas."}
            </p>
          </div>

          {/* Hallazgos — estilo acordeón/tabla */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <Bug className="w-3.5 h-3.5" /> Detalles de la Inspección (Hallazgos y Afectaciones)
            </h3>
            {Object.keys(groupedEvals).length === 0 ? (
              <div className="bg-card border border-dashed border-border p-6 rounded-xl text-center">
                <p className="text-muted-foreground italic text-xs">No hay evaluación técnica registrada aún.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                {/* Cabecera de tabla */}
                <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-card border-b border-border">
                  <p className="col-span-3 text-[11px] font-black text-muted-foreground uppercase tracking-widest">Lote / Cultivo</p>
                  <p className="col-span-2 text-[11px] font-black text-muted-foreground uppercase tracking-widest">Plaga</p>
                  <p className="col-span-2 text-[11px] font-black text-muted-foreground uppercase tracking-widest">Afectadas / Total</p>
                  <p className="col-span-2 text-[11px] font-black text-muted-foreground uppercase tracking-widest">Incidencia</p>
                  <p className="col-span-2 text-[11px] font-black text-muted-foreground uppercase tracking-widest">Severidad</p>
                  <p className="col-span-1 text-[11px] font-black text-muted-foreground uppercase tracking-widest"></p>
                </div>

                {/* Filas */}
                {Object.entries(groupedEvals).map(([, lotesMap]) =>
                  Object.entries(lotesMap).map(([loteKey, evaluaciones]) =>
                    evaluaciones.map((ev, i: number) => {
                      const pct = typeof ev.porcentaje === 'number' ? ev.porcentaje : parseFloat(ev.porcentaje || '0')
                      const rowId = `${loteKey}-${i}`
                      const isOpen = selectedDossierLugar === rowId

                      let severityLabel = "LEVE"
                      let themeColor = "text-emerald-400"
                      let progressColor = "bg-emerald-500"
                      let badgeStyle = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"

                      if (pct > 20) {
                        severityLabel = "CRÍTICO"; themeColor = "text-rose-400"; progressColor = "bg-rose-500"
                        badgeStyle = "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      } else if (pct > 5) {
                        severityLabel = "MODERADO"; themeColor = "text-amber-400"; progressColor = "bg-amber-500"
                        badgeStyle = "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      }

                      // Buscar loteInfo para especie/variedad
                      let loteInfo: Lote | null = null
                      for (const lugar of (context?.lugares_produccion || [])) {
                        const lotesDelLugar = [
                          ...(lugar.lotes || []),
                          ...(lugar.predios || []).flatMap((predio) => predio.lotes || [])
                        ]
                        for (const lote of lotesDelLugar) {
                          if (String(ev.id_lote) === String(lote.id_lote) || (ev.siembra && Number(ev.siembra.id_siembra) === Number(lote.siembra_activa?.id_siembra))) {
                            loteInfo = lote; break
                          }
                        }
                        if (loteInfo) break
                      }

                      return (
                        <div key={rowId} className={`border-b border-border/60 last:border-0 transition-colors ${isOpen ? 'bg-card/80' : 'bg-background hover:bg-card/40'}`}>
                          {/* Fila principal clickeable */}
                          <div
                            onClick={() => setSelectedDossierLugar(isOpen ? null : rowId)}
                            className="grid grid-cols-12 gap-2 px-4 py-4 cursor-pointer items-center"
                          >
                            {/* Lote / Cultivo */}
                            <div className="col-span-3">
                              <p className="text-sm font-black text-foreground uppercase tracking-wide truncate">{loteKey.split(' (')[0]}</p>
                              {loteInfo?.siembra_activa && (
                                <p className="text-[11px] text-muted-foreground font-bold mt-0.5 truncate">
                                  {loteInfo.siembra_activa.especie}
                                  {loteInfo.siembra_activa.variedad ? ` · ${getVariedadNombre(loteInfo.siembra_activa)}` : ''}
                                </p>
                              )}
                            </div>

                            {/* Plaga */}
                            <div className="col-span-2 flex items-center gap-1.5">
                              <Bug className={`w-3.5 h-3.5 flex-shrink-0 ${themeColor}`} />
                              <span className="group relative flex items-center min-w-0">
                                <span className="block text-sm font-black text-foreground uppercase truncate">{ev.plaga}</span>
                                <span className="pointer-events-none absolute left-0 top-full z-30 mt-2 max-w-[260px] rounded-lg border border-emerald-500/30 bg-popover px-3 py-2 text-[11px] font-bold normal-case leading-snug text-popover-foreground opacity-0 shadow-2xl transition-opacity group-hover:opacity-100 group-focus:opacity-100 group-active:opacity-100">
                                  {ev.plaga}
                                </span>
                              </span>
                            </div>

                            {/* Afectadas / Total */}
                            <div className="col-span-2">
                              <p className="text-sm font-black text-foreground">
                                <span className={themeColor}>{ev.afectadas}</span>
                                <span className="text-muted-foreground/70"> / {ev.totales}</span>
                              </p>
                              <p className="text-[10px] text-muted-foreground font-bold uppercase">plantas</p>
                            </div>

                            {/* Barra + % */}
                            <div className="col-span-2 space-y-1">
                              <p className={`text-sm font-black italic ${themeColor}`}>{pct.toFixed(1)}%</p>
                              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${progressColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                            </div>

                            {/* Badge severidad */}
                            <div className="col-span-2">
                              <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-widest ${badgeStyle}`}>
                                {severityLabel}
                              </span>
                            </div>

                            {/* Chevron */}
                            <div className="col-span-1 flex justify-end">
                              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-90 text-emerald-500' : ''}`} />
                            </div>
                          </div>

                      {/* Panel expandido */}
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="border-t border-border/60 bg-background/60 px-4 py-4"
                          onAnimationStart={() => {
                            const idDetalle = (ev as EvalItem).id_detalle
                            if (idDetalle) fetchEvidenciasDetalle(idDetalle, rowId)
                          }}
                        >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {loteInfo?.siembra_activa && (
                                  <div className="space-y-2.5">
                                    <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Datos del Cultivo</p>
                                    <div className="grid grid-cols-3 gap-2">
                                      {[
                                        { label: 'Especie', value: loteInfo.siembra_activa.especie || 'N/A' },
                                        { label: 'Variedad', value: getVariedadNombre(loteInfo.siembra_activa) },
                                        { label: 'Ciclo', value: loteInfo.siembra_activa.ciclo || 'N/A' },
                                      ].map(({ label, value }) => (
                                        <div key={label} className="bg-card rounded-lg p-2.5 border border-border/40 min-w-0">
                                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
                                          <TruncatedValue value={String(value)} />
                                        </div>
                                      ))}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      {[
                                        { label: 'Plantas Totales', value: loteInfo.siembra_activa.cantidad_plantas ? `${loteInfo.siembra_activa.cantidad_plantas} plantas` : '0 plantas' },
                                        { label: 'Área del Lote', value: `${loteInfo.area || 0} m²` },
                                      ].map(({ label, value }) => (
                                        <div key={label} className="bg-card rounded-lg p-2.5 border border-border/40 min-w-0">
                                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
                                          <TruncatedValue value={String(value)} tone="emerald" />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Recomendación + Observaciones */}
                                <div className="space-y-2.5">
                                  <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Recomendación de Intervención</p>
                                  <div className="bg-card border-l-2 border-emerald-500/60 pl-3 pr-2 py-2.5 rounded-r-lg">
                                    <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-1">Recomendación Técnica</p>
                                    <p className="text-sm text-foreground leading-relaxed">{ev.recomendacion}</p>
                                  </div>
                                  {ev.nota && ev.nota !== ev.recomendacion && (
                                    <div className="bg-card border-l-2 border-emerald-500/60 pl-3 pr-2 py-2.5 rounded-r-lg">
                                      <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-1">Observaciones</p>
                                      <p className="text-sm text-foreground leading-relaxed">{ev.nota}</p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Evidencias Fotográficas del Lote */}
                              <div className="mt-6 pt-4 border-t border-border/40">
                                <div className="flex items-center justify-between mb-4">
                                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4" /> Evidencias Fotográficas — {loteInfo?.nombre_lote || loteKey.split(' (')[0]}
                                  </p>
                                  {evidenciasPorDetalle[rowId] && (
                                    <span className="text-[10px] font-black text-muted-foreground bg-card px-3 py-1 rounded-full border border-border">
                                      {evidenciasPorDetalle[rowId].length} foto{evidenciasPorDetalle[rowId].length !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                                {loadingEvidencias[rowId] ? (
                                  <div className="flex items-center justify-center py-8 bg-card/30 rounded-xl border border-dashed border-border">
                                    <div className="flex items-center gap-3">
                                      <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                                      <span className="text-xs text-muted-foreground font-bold">Cargando evidencias...</span>
                                    </div>
                                  </div>
                                ) : evidenciasPorDetalle[rowId]?.length ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {evidenciasPorDetalle[rowId].map((evFoto, idx) => (
                                      <div
                                        key={idx}
                                        onClick={() => setPreviewImage({ url: evFoto.imagen_url, title: `${loteInfo?.nombre_lote || loteKey.split(' (')[0]} — Evidencia ${idx + 1}` })}
                                        className="group relative aspect-[4/3] rounded-2xl overflow-hidden border-2 border-border bg-card cursor-pointer hover:border-emerald-500/50 transition-all duration-300 shadow-lg hover:shadow-emerald-950/30"
                                      >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={evFoto.imagen_url}
                                          alt={`Evidencia ${idx + 1}`}
                                          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-75"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                                        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                          <div className="flex items-center justify-between">
                                            <p className="text-xs font-black text-foreground drop-shadow-lg truncate">{loteInfo?.nombre_lote || loteKey.split(' (')[0]}</p>
                                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20 backdrop-blur-sm">Ver foto</span>
                                          </div>
                                        </div>
                                        <div className="absolute top-3 left-3">
                                          <span className="text-[9px] font-black text-foreground bg-background/60 px-2.5 py-1 rounded-lg backdrop-blur-sm border border-border/50">
                                            #{idx + 1}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center py-8 bg-card/20 rounded-xl border border-dashed border-border gap-2">
                                    <ImageIcon className="w-8 h-8 text-muted-foreground/70" />
                                    <p className="text-xs text-muted-foreground italic">Sin evidencias fotográficas registradas para este lote.</p>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </div>
                      )
                    })
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Lightbox de previsualización */}
      {previewImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/95 backdrop-blur-2xl p-4 md:p-8 cursor-pointer overflow-hidden"
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-5 right-5 w-12 h-12 bg-card/50 hover:bg-muted rounded-full flex items-center justify-center text-foreground transition-all border border-border/50 z-10"
          >
            <X className="w-6 h-6" />
          </button>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-[95vw] sm:max-w-[85vw] md:max-w-[70vw] lg:max-w-[55vw] aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-border bg-background flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage.url}
              alt={previewImage.title}
              className="w-full h-full object-contain select-none"
            />
          </motion.div>
          <div className="mt-4 text-center max-w-[90vw]">
            <p className="text-sm md:text-base font-black text-foreground/90 drop-shadow-lg">{previewImage.title}</p>
          </div>
        </motion.div>
      )}
    </div>
  )
}

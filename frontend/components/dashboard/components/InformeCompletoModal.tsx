import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { MapPin, ChevronRight, X, FileText, UserCheck, ClipboardList, Leaf, Bug } from "lucide-react"
import { Loader2 } from "lucide-react"
import api from "@/lib/api"
import { Inspection, FormData } from "../types/inspection"

interface Props {
  inspection: Inspection
  liveFormData?: FormData
  onClose: () => void
}

export function InformeCompletoModal({ inspection, liveFormData, onClose }: Props) {
  const [context, setContext] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDossierLugar, setSelectedDossierLugar] = useState<number | null>(null)
  const [selectedDossierLote, setSelectedDossierLote] = useState<number | null>(null)
  const [showPredios, setShowPredios] = useState(false)

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

  const evals = liveFormData
    ? liveFormData.evaluations
    : (context?.hallazgos_previos?.map((hp: any) => ({
      id_lote: hp.id_lote || hp.siembra_id,
      siembra: { id_siembra: hp.siembra_id },
      afectadas: hp.cantidad_plantas_afectadas,
      totales: hp.plantas_totales || hp.cantidad_plantas_afectadas,
      porcentaje: hp.porcentaje_infestacion,
      plaga: hp.observaciones_especificas.match(/\[Plaga:(.+?)\]/)?.[1]?.trim() || "Plaga guardada",
      recomendacion: hp.observaciones_especificas.match(/\[Recomendacion:(.+?)\]/)?.[1]?.trim() || "N/A",
      nota: hp.observaciones_especificas.split('] | ').pop() || ""
    })) || [])

  const groupedEvals = useMemo(() => {
    const groups: Record<string, Record<string, any[]>> = {}
    evals.forEach((ev: any) => {
      let targetLugar = null
      let targetLote = null
      for (const lugar of (context?.lugares_produccion || [])) {
        for (const lote of (lugar.lotes || [])) {
          if (ev.id_lote === lote.id_lote || (ev.siembra && ev.siembra.id_siembra === lote.siembra_activa?.id_siembra)) {
            targetLugar = lugar
            targetLote = lote
            break
          }
        }
        if (targetLugar) break
      }
      const lugarKey = targetLugar ? (targetLugar as any).nombre_lugar : 'Sin Lugar Identificado'
      const siembra = targetLote ? (targetLote as any).siembra_activa : null
      const siembraDetail = siembra
        ? ` (Especie: ${siembra.especie || 'N/A'}${siembra.variedad ? ` · Variedad: ${siembra.variedad}` : ''})`
        : ' (Sin Siembra Activa)'
      const loteKey = targetLote
        ? `${(targetLote as any).nombre_lote}${siembraDetail}`
        : 'Sin Lote Identificado'
      if (!groups[lugarKey]) groups[lugarKey] = {}
      if (!groups[lugarKey][loteKey]) groups[lugarKey][loteKey] = []
      groups[lugarKey][loteKey].push(ev)
    })
    return groups
  }, [evals, context?.lugares_produccion])

  if (loading) return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
      <Loader2 className="w-12 h-12 text-teal-500 animate-spin" />
    </div>
  )

  const lugarInspeccion = context?.lugares_produccion?.find(
    (l: any) => l.id_lugar_produccion === context?.id_lugar_produccion
  ) || context?.lugares_produccion?.[0];
  const prediosDelLugar = lugarInspeccion?.predios || [];

  const genObs = liveFormData ? liveFormData.generalObs : inspection.observaciones_generales

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl bg-slate-950 border border-teal-500/20 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-slate-900 border-b border-slate-800 p-5 flex items-center justify-between shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 blur-[85px] rounded-full -mr-20 -mt-20" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center border border-teal-500/25">
              <FileText className="text-teal-400 w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white italic uppercase tracking-tighter leading-none">Informe Técnico</h2>
              <p className="text-teal-400 font-bold text-[10px] uppercase tracking-[0.25em] mt-1.5">
                Inspección {inspection.estado === 'finalizada' ? 'Finalizada' : 'En Proceso'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="relative z-10 w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scroll body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Productor / Lugar */}
          {/* Info General — basado en secciones I y II del informe ICA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 relative overflow-hidden">
              <UserCheck className="absolute -right-4 -bottom-4 w-20 h-20 text-slate-800/20" />
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5 relative z-10">Titular de la Empresa</p>
              <p className="text-base font-black text-white relative z-10">{context?.productor?.nombre}</p>
              <p className="text-xs text-slate-400 relative z-10 mt-0.5">{context?.productor?.ubicacion}</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 relative overflow-hidden">
              <MapPin className="absolute -right-4 -bottom-4 w-20 h-20 text-slate-800/20" />
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5 relative z-10">Lugar de Producción</p>
              <p className="text-base font-black text-white relative z-10">{context?.lugar_nombre || 'Sin registrar'}</p>
              <p className="text-xs text-slate-400 relative z-10 mt-0.5">{context?.area_lugar} Ha · Área Operativa</p>
            </div>
            {/* Técnico asignado + Predios — sección II del informe ICA */}
            <div className="md:col-span-2 space-y-2">
              {/* Fila: N° Registro ICA | Técnico Asignado | Predios (collapsible) */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'N° Registro ICA', value: context?.lugares_produccion?.find((l: any) => l.es_lugar_inspeccion)?.numero_registro || context?.lugares_produccion?.[0]?.numero_registro || 'Pendiente' },
                  { label: 'Técnico Asignado', value: inspection.tecnico_nombre || context?.tecnico_nombre || 'No asignado' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
                    <p className="text-xs font-black text-white italic truncate" title={value}>{value}</p>
                  </div>
                ))}

                {/* Predios — botón desplegable */}
                <button
                  type="button"
                  onClick={() => setShowPredios(open => !open)}
                  className={`bg-slate-900/60 border rounded-xl p-3.5 text-left flex items-start justify-between gap-2 hover:bg-slate-900 transition-colors ${
                    showPredios ? 'border-emerald-500/40' : 'border-slate-800'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-0.5">Predios del Lugar</p>
                    <p className="text-xs font-black text-white italic">
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
                  className="bg-slate-950/80 border border-emerald-500/20 rounded-xl p-3 space-y-2 overflow-hidden"
                >
                  {prediosDelLugar.length === 0 ? (
                    <p className="text-xs text-slate-500 italic text-center py-2">No hay predios registrados.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {prediosDelLugar.map((p: any) => (
                        <div key={p.id_predio} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                          <p className="text-sm font-black text-white uppercase tracking-wide leading-tight">{p.nombre_predio}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            <span className="font-bold text-slate-500">N° Predial: </span>
                            {p.numero_predial || 'N/A'}
                          </p>
                          <p className="text-sm font-black text-emerald-400 mt-1.5">
                            {p.area_hectareas || 0} <span className="text-xs font-bold text-slate-400">Ha</span>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(() => {
                const predios = context?.lugares_produccion?.flatMap((l: any) => l.predios || []) || []
                const todosLotes = predios.flatMap((p: any) =>
                  (p.lotes || []).map((lote: any) => ({ ...lote, predio_nombre: p.nombre_predio }))
                )
                if (todosLotes.length === 0) return (
                  <p className="col-span-full text-slate-500 italic text-sm text-center py-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                    No hay lotes registrados.
                  </p>
                )
                return todosLotes.map((lote: any) => {
                  const isOpen = selectedDossierLote === lote.id_lote
                  const hasData = !!lote.siembra_activa
                  return (
                    <div key={lote.id_lote} className={`rounded-xl border transition-all overflow-hidden ${isOpen ? 'bg-emerald-600/5 border-emerald-500/30' : 'bg-slate-900 border-slate-800/80 hover:border-slate-700'
                      }`}>
                      <div onClick={() => setSelectedDossierLote(isOpen ? null : lote.id_lote)} className="flex items-center gap-3 p-3 cursor-pointer">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${hasData ? 'bg-emerald-500/10' : 'bg-slate-800'}`}>
                          <Leaf className={`w-4.5 h-4.5 ${hasData ? 'text-emerald-500' : 'text-slate-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-white italic uppercase tracking-tight truncate">{lote.nombre_lote}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[9px] text-slate-500 font-bold uppercase">{lote.predio_nombre}</span>
                            <span className="text-slate-700">·</span>
                            <span className="text-[9px] text-slate-500 font-bold">{lote.area} m²</span>
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${hasData
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-700/50 text-slate-500 border border-slate-700'
                              }`}>
                              {hasData ? lote.siembra_activa.especie : 'Sin siembra'}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 text-slate-600 transition-transform flex-shrink-0 ${isOpen ? 'rotate-90 text-emerald-500' : ''}`} />
                      </div>

                      {isOpen && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="border-t border-emerald-500/20 bg-slate-950/50">
                          {hasData ? (
                            <div className="p-3 grid grid-cols-3 gap-3">
                              {[
                                { label: 'Especie', value: lote.siembra_activa.especie },
                                { label: 'Variedad', value: lote.siembra_activa.variedad || 'Genérica' },
                                { label: 'Ciclo', value: lote.siembra_activa.ciclo || 'N/A', isBadge: true },
                                { label: 'Fecha Siembra', value: new Date(lote.siembra_activa.fecha_siembra).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' }) },
                                { label: 'Censo', value: `${lote.siembra_activa.cantidad_plantas} plantas`, isGreen: true },
                                { label: 'Área', value: `${lote.area} m²` },
                              ].map(({ label, value, isBadge, isGreen }) => (
                                <div key={label} className="min-w-0">
                                  <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-0.5">{label}</p>
                                  {isBadge ? (
                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase block w-fit ${value === 'ANUAL' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>{value}</span>
                                  ) : (
                                    <p className={`text-xs font-bold italic truncate ${isGreen ? 'text-emerald-400' : 'text-white'}`}>{value}</p>
                                  )}
                                </div>
                              ))}
                              {lote.siembra_activa.edad_dias && (
                                <div className="col-span-full bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2.5 flex items-center justify-between">
                                  <p className="text-[8px] text-emerald-500 font-black uppercase tracking-widest">Edad del Cultivo</p>
                                  <p className="text-sm text-white font-black italic">{lote.siembra_activa.edad_dias} <span className="text-emerald-500 text-xs font-normal">días en campo</span></p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-3 text-center">
                              <p className="text-slate-550 italic text-[11px]">Sin siembra activa registrada.</p>
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
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2.5 flex items-center gap-2">
              <ClipboardList className="w-3.5 h-3.5 text-emerald-500" /> Observaciones Generales
            </p>
            <p className="text-xs text-slate-355 italic bg-slate-950 p-3 rounded-lg border border-slate-850">
              {genObs || "Sin observaciones generales registradas."}
            </p>
          </div>

          {/* Hallazgos — estilo acordeón/tabla */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <Bug className="w-3.5 h-3.5" /> Detalles de la Inspección (Hallazgos y Afectaciones)
            </h3>
            {Object.keys(groupedEvals).length === 0 ? (
              <div className="bg-slate-900 border border-dashed border-slate-700 p-6 rounded-xl text-center">
                <p className="text-slate-500 italic text-xs">No hay evaluación técnica registrada aún.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                {/* Cabecera de tabla */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-900 border-b border-slate-800">
                  <p className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lote / Cultivo</p>
                  <p className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plaga</p>
                  <p className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Afectadas / Total</p>
                  <p className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Incidencia</p>
                  <p className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Severidad</p>
                  <p className="col-span-1 text-[10px] font-black text-slate-400 uppercase tracking-widest"></p>
                </div>

                {/* Filas */}
                {Object.entries(groupedEvals).map(([lugarKey, lotesMap]) =>
                  Object.entries(lotesMap).map(([loteKey, evaluaciones]) =>
                    (evaluaciones as any[]).map((ev: any, i: number) => {
                      const pct = typeof ev.porcentaje === 'number' ? ev.porcentaje : parseFloat(ev.porcentaje || '0')
                      const rowId = `${loteKey}-${i}`
                      const isOpen = selectedDossierLugar === rowId as any

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
                      let loteInfo: any = null
                      for (const lugar of (context?.lugares_produccion || [])) {
                        for (const lote of (lugar.lotes || [])) {
                          if (ev.id_lote === lote.id_lote || (ev.siembra && ev.siembra.id_siembra === lote.siembra_activa?.id_siembra)) {
                            loteInfo = lote; break
                          }
                        }
                        if (loteInfo) break
                      }

                      return (
                        <div key={rowId} className={`border-b border-slate-800/60 last:border-0 transition-colors ${isOpen ? 'bg-slate-900/80' : 'bg-slate-950 hover:bg-slate-900/40'}`}>
                          {/* Fila principal clickeable */}
                          <div
                            onClick={() => setSelectedDossierLugar(isOpen ? null : rowId as any)}
                            className="grid grid-cols-12 gap-2 px-4 py-3.5 cursor-pointer items-center"
                          >
                            {/* Lote / Cultivo */}
                            <div className="col-span-3">
                              <p className="text-xs font-black text-white uppercase tracking-wide truncate">{loteKey.split(' (')[0]}</p>
                              {loteInfo?.siembra_activa && (
                                <p className="text-[10px] text-slate-400 font-bold mt-0.5 truncate">
                                  {loteInfo.siembra_activa.especie}
                                  {loteInfo.siembra_activa.variedad ? ` · ${loteInfo.siembra_activa.variedad}` : ''}
                                </p>
                              )}
                            </div>

                            {/* Plaga */}
                            <div className="col-span-2 flex items-center gap-1.5">
                              <Bug className={`w-3.5 h-3.5 flex-shrink-0 ${themeColor}`} />
                              <p className="text-xs font-black text-white uppercase truncate">{ev.plaga}</p>
                            </div>

                            {/* Afectadas / Total */}
                            <div className="col-span-2">
                              <p className="text-xs font-black text-white">
                                <span className={themeColor}>{ev.afectadas}</span>
                                <span className="text-slate-600"> / {ev.totales}</span>
                              </p>
                              <p className="text-[9px] text-slate-500 font-bold uppercase">plantas</p>
                            </div>

                            {/* Barra + % */}
                            <div className="col-span-2 space-y-1">
                              <p className={`text-xs font-black italic ${themeColor}`}>{pct.toFixed(1)}%</p>
                              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
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
                              <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-90 text-emerald-500' : ''}`} />
                            </div>
                          </div>

                          {/* Panel expandido */}
                          {isOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="border-t border-slate-800/60 bg-slate-950/60 px-4 py-4"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Info del cultivo */}
                                {loteInfo?.siembra_activa && (
                                  <div className="space-y-2.5">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Datos del Cultivo</p>
                                    <div className="grid grid-cols-3 gap-2">
                                      {[
                                        { label: 'Especie', value: loteInfo.siembra_activa.especie },
                                        { label: 'Variedad', value: loteInfo.siembra_activa.variedad || 'Genérica' },
                                        { label: 'Ciclo', value: loteInfo.siembra_activa.ciclo || 'N/A' },
                                      ].map(({ label, value }) => (
                                        <div key={label} className="bg-slate-900 rounded-lg p-2 border border-slate-800/40">
                                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
                                          <p className="text-xs font-black text-white uppercase truncate">{value}</p>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      {[
                                        { label: 'Plantas Totales', value: `${loteInfo.siembra_activa.cantidad_plantas} plantas` },
                                        { label: 'Área del Lote', value: `${loteInfo.area} m²` },
                                      ].map(({ label, value }) => (
                                        <div key={label} className="bg-slate-900 rounded-lg p-2 border border-slate-800/40">
                                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
                                          <p className="text-xs font-black text-emerald-400">{value}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Recomendación + Observaciones */}
                                <div className="space-y-2.5">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recomendación de Intervención</p>
                                  <div className="bg-slate-900 border-l-2 border-emerald-500/60 pl-3 pr-2 py-2.5 rounded-r-lg">
                                    <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest mb-1">Recomendación Técnica</p>
                                    <p className="text-xs text-slate-200 leading-relaxed">{ev.recomendacion}</p>
                                  </div>
                                  {ev.nota && ev.nota !== ev.recomendacion && (
                                    <div className="bg-slate-900 border-l-2 border-emerald-500/60 pl-3 pr-2 py-2.5 rounded-r-lg">
                                      <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest mb-1">Observaciones</p>
                                      <p className="text-xs text-slate-200 leading-relaxed">{ev.nota}</p>
                                    </div>
                                  )}
                                </div>
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
    </div>
  )
}

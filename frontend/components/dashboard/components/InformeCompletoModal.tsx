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
      const loteKey = targetLote
        ? ((targetLote as any).nombre_lote + ((targetLote as any).siembra_activa?.especie ? " (" + (targetLote as any).siembra_activa.especie + ")" : " (Sin Siembra Activa)"))
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

  const genObs = liveFormData ? liveFormData.generalObs : inspection.observaciones_generales

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 py-8">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-5xl bg-slate-950 border-2 border-teal-500/30 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-full"
      >
        {/* Header */}
        <div className="bg-slate-900 border-b border-slate-800 p-8 flex items-center justify-between shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 blur-[80px] rounded-full -mr-20 -mt-20" />
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-16 h-16 bg-teal-500/20 rounded-2xl flex items-center justify-center border border-teal-500/30">
              <FileText className="text-teal-400 w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">Informe Técnico</h2>
              <p className="text-teal-400 font-bold text-xs uppercase tracking-[0.3em] mt-2">
                Inspección {inspection.estado === 'finalizada' ? 'Finalizada' : 'En Proceso'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="relative z-10 w-12 h-12 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center text-white transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scroll body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          {/* Productor / Lugar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 relative overflow-hidden">
              <UserCheck className="absolute -right-6 -bottom-6 w-32 h-32 text-slate-800/30" />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 relative z-10">Productor Responsable</p>
              <p className="text-xl font-black text-white relative z-10">{context?.productor?.nombre}</p>
              <p className="text-sm text-slate-400 relative z-10">{context?.productor?.ubicacion}</p>
            </div>
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 relative overflow-hidden">
              <MapPin className="absolute -right-6 -bottom-6 w-32 h-32 text-slate-800/30" />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 relative z-10">Lugar / Predio</p>
              <p className="text-xl font-black text-white relative z-10">{context?.nombre_predio_oficial || context?.lugar_nombre}</p>
              <p className="text-sm text-slate-400 relative z-10">{context?.area_lugar} M² Área Operativa</p>
            </div>
          </div>

          {/* Jerarquía */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-emerald-400 uppercase tracking-[0.4em] flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Jerarquía Registrada
            </h4>
            <div className="space-y-3">
              {context?.lugares_produccion?.map((lugar: any) => {
                const isLugarOpen = selectedDossierLugar === lugar.id_lugar_produccion
                return (
                  <div key={lugar.id_lugar_produccion} className={`rounded-3xl border-2 transition-all overflow-hidden ${
                    isLugarOpen
                      ? 'bg-teal-600/5 border-teal-500/40 shadow-xl shadow-teal-900/10'
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                  }`}>
                    <div
                      onClick={() => { setSelectedDossierLugar(isLugarOpen ? null : lugar.id_lugar_produccion); setSelectedDossierLote(null) }}
                      className="flex items-center gap-5 p-5 cursor-pointer"
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${
                        isLugarOpen ? 'bg-teal-600/20' : 'bg-slate-900 border border-slate-800'
                      }`}>
                        <MapPin className={`w-6 h-6 transition-colors ${isLugarOpen ? 'text-teal-400' : 'text-slate-600'}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white font-black italic uppercase tracking-tight">{lugar.nombre_lugar}</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                          {lugar.area_total || 0} m² · {lugar.lotes?.length || 0} lotes
                          {lugar.es_lugar_inspeccion && <span className="text-teal-400 ml-2">★ INSPECCIÓN ACTUAL</span>}
                        </p>
                      </div>
                      <ChevronRight className={`w-5 h-5 text-slate-600 transition-transform flex-shrink-0 ${isLugarOpen ? 'rotate-90 text-teal-400' : ''}`} />
                    </div>

                    {isLugarOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="border-t border-teal-500/20 bg-slate-950/30 p-4 space-y-2"
                      >
                        {lugar.lotes?.map((lote: any) => {
                          const isLoteOpen = selectedDossierLote === lote.id_lote
                          const hasData = !!lote.siembra_activa
                          return (
                            <div key={lote.id_lote} className={`rounded-2xl border-2 transition-all overflow-hidden ${
                              isLoteOpen ? 'bg-emerald-600/5 border-emerald-500/40' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                            }`}>
                              <div
                                onClick={(e) => { e.stopPropagation(); setSelectedDossierLote(isLoteOpen ? null : lote.id_lote) }}
                                className="flex items-center gap-4 p-4 cursor-pointer"
                              >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isLoteOpen ? 'bg-emerald-600/20' : 'bg-slate-800'}`}>
                                  <Leaf className={`w-4 h-4 ${isLoteOpen ? 'text-emerald-500' : 'text-slate-600'}`} />
                                </div>
                                <div className="flex-1 grid grid-cols-3 gap-3">
                                  <div>
                                    <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest">Lote</p>
                                    <p className="text-xs text-white font-black italic uppercase">{lote.nombre_lote}</p>
                                  </div>
                                  <div>
                                    <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest">Cultivo</p>
                                    <p className={`text-xs font-black italic ${hasData ? 'text-emerald-400' : 'text-slate-600'}`}>
                                      {lote.siembra_activa?.especie || 'LIBRE'}
                                    </p>
                                  </div>
                                  <div className="text-right flex items-center justify-end gap-2">
                                    <span className="text-[8px] text-slate-500 font-bold">{lote.area} m²</span>
                                    <span className={`text-[7px] font-black px-2 py-1 rounded-full uppercase ${
                                      lote.estado_lote === 'disponible' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                                    }`}>{lote.estado_lote || 'N/A'}</span>
                                  </div>
                                </div>
                                <ChevronRight className={`w-4 h-4 text-slate-600 transition-transform flex-shrink-0 ${isLoteOpen ? 'rotate-90 text-emerald-500' : ''}`} />
                              </div>
                              {isLoteOpen && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="border-t border-emerald-500/20 bg-slate-950/50"
                                >
                                  {hasData ? (
                                    <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-5">
                                      {[
                                        { label: 'Especie', value: lote.siembra_activa.especie },
                                        { label: 'Variedad', value: lote.siembra_activa.variedad || 'Genérica' },
                                        { label: 'Ciclo', value: lote.siembra_activa.ciclo || 'N/A', isBadge: true },
                                        { label: 'Fecha Siembra', value: new Date(lote.siembra_activa.fecha_siembra).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) },
                                        { label: 'Censo (Plantas)', value: `${lote.siembra_activa.cantidad_plantas} unidades`, isGreen: true },
                                        { label: 'Productor', value: context?.productor?.nombre },
                                      ].map(({ label, value, isBadge, isGreen }) => (
                                        <div key={label}>
                                          <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">{label}</p>
                                          {isBadge ? (
                                            <span className={`text-[8px] font-black px-3 py-1 rounded uppercase ${
                                              value === 'ANUAL' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'
                                            }`}>{value}</span>
                                          ) : (
                                            <p className={`text-sm font-bold italic ${isGreen ? 'text-emerald-400 font-black' : 'text-white'} truncate`}>{value}</p>
                                          )}
                                        </div>
                                      ))}
                                      {lote.siembra_activa.edad_dias && (
                                        <div className="col-span-full bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
                                          <p className="text-[8px] text-emerald-500 font-black uppercase tracking-widest mb-1">Edad Cronológica del Cultivo</p>
                                          <p className="text-xl text-white font-black italic">
                                            {lote.siembra_activa.edad_dias} <span className="text-emerald-500 text-sm">días en campo</span>
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="p-5 text-center">
                                      <p className="text-slate-500 italic text-xs">Sin siembra activa registrada.</p>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </div>
                          )
                        })}
                      </motion.div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Observaciones generales */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-500" /> Observaciones Generales
            </p>
            <p className="text-sm text-slate-300 italic bg-slate-950 p-4 rounded-xl border border-slate-800/50">
              {genObs || "Sin observaciones generales registradas."}
            </p>
          </div>

          {/* Hallazgos */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Bug className="w-4 h-4" /> Detalle de Hallazgos y Afectaciones
            </h3>
            {Object.keys(groupedEvals).length === 0 ? (
              <div className="bg-slate-900 border border-dashed border-slate-700 p-8 rounded-3xl text-center">
                <p className="text-slate-500 italic">No hay evaluación técnica registrada aún.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedEvals).map(([lugarKey, lotesMap]) => (
                  <div key={lugarKey} className="bg-slate-900 overflow-hidden rounded-3xl border border-slate-800">
                    <div className="bg-slate-950 p-4 border-b border-slate-800">
                      <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <MapPin className="text-emerald-500 w-4 h-4" /> {lugarKey}
                      </h4>
                    </div>
                    <div className="p-6 space-y-8">
                      {Object.entries(lotesMap).map(([loteKey, evaluaciones]) => (
                        <div key={loteKey} className="space-y-4">
                          <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Leaf className="w-3 h-3 text-teal-400" /> {loteKey}
                          </h5>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {(evaluaciones as any[]).map((ev: any, i: number) => (
                              <div key={i} className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col gap-4 hover:border-teal-500/30 transition-colors">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Plaga / Problema</p>
                                    <p className="text-lg font-black text-white uppercase italic tracking-tight">{ev.plaga}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Infestación</p>
                                    <p className={`text-xl font-black ${ev.porcentaje > 20 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                      {typeof ev.porcentaje === 'number' ? ev.porcentaje.toFixed(1) : ev.porcentaje}%
                                    </p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 bg-slate-900 p-3 rounded-xl border border-slate-800/50">
                                  <div>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Afectadas</p>
                                    <p className="text-sm text-white font-bold">{ev.afectadas} ptas</p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Totales</p>
                                    <p className="text-sm text-white font-bold">{ev.totales} ptas</p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Recomendación / Nota</p>
                                  <p className="text-xs text-slate-300">
                                    <span className="text-teal-400 font-bold">{ev.recomendacion}</span> - {ev.nota || 'Sin notas.'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

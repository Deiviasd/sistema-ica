import { useState } from "react"
import { motion } from "framer-motion"
import { MapPin, ChevronRight, X, ShieldCheck, UserCheck, Leaf } from "lucide-react"
import { Button } from "@/components/ui/button"

import { ContextoInspeccion, HallazgoPrevio, SiembraActiva } from "../types/inspection"

type TraceTab = 'historial' | 'plagas' | 'inspecciones'

const TRACE_TABS: { id: TraceTab; label: string }[] = [
  { id: 'historial', label: 'Cultivo e historial' },
  { id: 'plagas', label: 'Plagas' },
  { id: 'inspecciones', label: 'Inspecciones' },
]

interface Props {
  context: ContextoInspeccion | null
  onClose: () => void
}

export function DossierModal({ context, onClose }: Props) {
  const [selectedLugar, setSelectedLugar] = useState<string | number | null>(null)
  const [selectedLote, setSelectedLote] = useState<string | number | null>(null)
  const [activeTabs, setActiveTabs] = useState<Record<string, TraceTab>>({})

  const formatDate = (date?: string | null) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const getVariedadNombre = (siembra?: SiembraActiva | null) => {
    if (!siembra?.variedad) return siembra?.variedad_nombre || 'Genérica'
    return typeof siembra.variedad === 'string' ? siembra.variedad : siembra.variedad.nombre_variedad || 'Genérica'
  }

  const getEspecieNombre = (siembra?: SiembraActiva | null) => {
    if (!siembra) return 'N/A'
    if (siembra.especie) return siembra.especie
    return typeof siembra.variedad === 'object' ? siembra.variedad.especie?.nombre_comun || 'N/A' : 'N/A'
  }

  const getPlagaNombre = (hallazgo: HallazgoPrevio) => (
    hallazgo.plaga || hallazgo.observaciones_especificas?.match(/\[Plaga:(.+?)\]/)?.[1]?.trim() || 'Plaga registrada'
  )

  const getTabForLote = (idLote: string | number): TraceTab => activeTabs[String(idLote)] || 'historial'

  const setTabForLote = (idLote: string | number, tab: TraceTab) => {
    setActiveTabs((prev) => ({ ...prev, [String(idLote)]: tab }))
  }

  const getDurationDays = (start?: string | null, end?: string | null) => {
    if (!start) return 'N/A'
    const endDate = end ? new Date(end) : new Date()
    const diffMs = endDate.getTime() - new Date(start).getTime()
    if (Number.isNaN(diffMs)) return 'N/A'
    return `${Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))} días`
  }

  const getSeverity = (percentage?: number) => {
    const value = Number(percentage || 0)
    if (value >= 20) return { label: 'Alta', rank: 3, className: 'bg-rose-500/10 text-rose-400 border-rose-500/20' }
    if (value >= 5) return { label: 'Media', rank: 2, className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' }
    return { label: 'Baja', rank: 1, className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }
  }

  const getStatusClass = (estado?: string) => {
    const normalized = estado?.toLowerCase()
    if (normalized === 'finalizada' || normalized === 'completada') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    if (normalized === 'programada') return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    if (normalized === 'en_proceso' || normalized === 'en curso') return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    if (normalized === 'cancelada') return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  }

  console.log('lugares:', context?.lugares_produccion?.map((l) => ({
    id: l.id_lugar_produccion,
    nombre: l.nombre_lugar,
    registro: l.numero_registro,
    es_lugar_inspeccion: l.es_lugar_inspeccion
  })))
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-4xl bg-slate-900 border-2 border-emerald-500/30 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(16,185,129,0.1)] flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="bg-emerald-600 p-6 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full -mr-20 -mt-20" />
          <div className="relative z-10 flex items-center gap-5">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/30">
              <ShieldCheck className="text-white w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">
                Dossier Técnico Integral
              </h2>
              <p className="text-emerald-100 font-bold text-[10px] uppercase tracking-[0.3em] mt-1.5 opacity-80">
                Protocolo de Identidad y Biología Agraria • ICA
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="relative z-10 w-10 h-10 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <MapPin className="text-emerald-500 w-5 h-5" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Localización Geográfica</span>
              </div>
              <div
                className="bg-slate-950 p-6 rounded-3xl border border-slate-800 cursor-pointer hover:border-emerald-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] transition-all group/map relative flex flex-col justify-center min-h-[104px]"
                onClick={() => {
                  const ubicacion = context?.productor?.ubicacion || '';
                  if (ubicacion && ubicacion !== 'SIN UBICACIÓN') {
                    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ubicacion)}`, '_blank');
                  }
                }}
                title="Abrir en Google Maps"
              >
                <div className="absolute top-4 right-4 opacity-0 group-hover/map:opacity-100 transition-opacity bg-emerald-500/10 p-2 rounded-xl">
                  <MapPin className="w-4 h-4 text-emerald-500 animate-bounce" />
                </div>
                <p className="text-2xl font-black text-white italic uppercase tracking-tighter mb-1 group-hover/map:text-emerald-400 transition-colors">
                  {context?.productor?.ubicacion || 'SIN UBICACIÓN'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <UserCheck className="text-emerald-500 w-5 h-5" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Productor Responsable</span>
              </div>
              <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800">
                <p className="text-2xl font-black text-white italic uppercase tracking-tighter mb-1">
                  {context?.productor?.nombre}
                </p>
                <p className="text-xs text-slate-400 font-bold tracking-tight uppercase">
                  {context?.productor?.ubicacion || 'Región Predeterminada'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Leaf className="text-emerald-500 w-5 h-5" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lugar de Producción</span>
              </div>
              <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 flex flex-col justify-center min-h-[104px]">
                <p
                  className="text-2xl font-black text-white italic uppercase tracking-tighter mb-1 line-clamp-2"
                  title={
                    context?.lugares_produccion?.find((l) => l.es_lugar_inspeccion)?.nombre_lugar
                    || context?.lugares_produccion?.[0]?.nombre_lugar
                    || 'Sitio No Asignado'
                  }
                >
                  {context?.lugares_produccion?.find((l) => l.es_lugar_inspeccion)?.nombre_lugar
                    || context?.lugares_produccion?.[0]?.nombre_lugar
                    || 'Sitio No Asignado'}
                </p>
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-1">
                  N° REGISTRO ICA:{' '}
                  {context?.lugares_produccion?.find((l) => l.es_lugar_inspeccion)?.numero_registro
                    || context?.lugares_produccion?.[0]?.numero_registro
                    || 'PENDIENTE ASIGNACIÓN'}
                </p>
              </div>
            </div>
          </div>

          {/* Jerarquía */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">
              PREDIOS ASIGNADOS Y LOTES — HAZ CLIC PARA EXPLORAR
            </h4>
            <div className="space-y-3">
              {context?.lugares_produccion?.flatMap((lugar) => lugar.predios || [])?.map((predio) => {
                const isOpen = selectedLugar === predio.id_predio
                return (
                  <div key={predio.id_predio} className={`rounded-3xl border-2 transition-all overflow-hidden ${isOpen
                    ? 'bg-teal-600/5 border-teal-500/40 shadow-xl shadow-teal-900/10'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                    }`}>
                    <div
                      onClick={() => { setSelectedLugar(isOpen ? null : predio.id_predio); setSelectedLote(null) }}
                      className="flex items-center gap-5 p-5 cursor-pointer"
                    >
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] z-10 ${isOpen ? 'bg-teal-600/20 border-teal-500/30' : 'bg-slate-900 border border-slate-800'} cursor-pointer`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (predio.latitud && predio.longitud) {
                            window.open(`https://www.google.com/maps/search/?api=1&query=${predio.latitud},${predio.longitud}`, '_blank');
                          } else {
                            const q = `${predio.region?.departamento || ''}, ${predio.region?.municipio || ''}, ${predio.region?.vereda || ''} Colombia`;
                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, '_blank');
                          }
                        }}
                        title="Ver en Google Maps"
                      >
                        <MapPin className={`w-6 h-6 transition-colors ${isOpen ? 'text-teal-400' : 'text-slate-500 hover:text-emerald-400'}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-lg text-white font-black italic uppercase tracking-tight">{predio.nombre_predio}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                          {predio.region?.departamento || 'N/A'}, {predio.region?.municipio || 'N/A'} - {predio.region?.vereda || 'N/A'}
                        </p>
                        <p className="text-sm text-slate-400 font-bold uppercase tracking-wider mt-1">
                          {predio.area_hectareas || 0} m² · {predio.lotes?.length || 0} lotes
                          <span className="text-emerald-500 ml-3">N° PREDIAL: {predio.numero_predial || 'N/A'}</span>
                        </p>
                      </div>
                      <ChevronRight className={`w-5 h-5 text-slate-600 transition-transform flex-shrink-0 ${isOpen ? 'rotate-90 text-teal-400' : ''}`} />
                    </div>

                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="border-t border-teal-500/20 bg-slate-950/30 p-4 space-y-2"
                      >
                        {predio.lotes?.length === 0 ? (
                          <p className="text-slate-600 text-xs italic text-center py-4">Sin lotes registrados en este predio.</p>
                        ) : predio.lotes?.map((lote) => {
                          const isLoteOpen = selectedLote === lote.id_lote
                          const hasData = !!lote.siembra_activa
                          const historial = context?.historial_lotes?.[String(lote.id_lote)]
                          const hallazgosHistoricos = historial?.hallazgos || []
                          const inspeccionesHistoricas = historial?.inspecciones || []
                          const activeTab = getTabForLote(lote.id_lote)
                          const cultivosAnteriores = (historial?.siembras || []).filter(
                            (siembra) => String(siembra.id_siembra) !== String(lote.siembra_activa?.id_siembra)
                          )
                          const maxSeverity = hallazgosHistoricos.reduce((max, hallazgo) => {
                            const severity = getSeverity(hallazgo.porcentaje_infestacion)
                            return severity.rank > max.rank ? severity : max
                          }, getSeverity(0))
                          const controlledCount = hallazgosHistoricos.filter((hallazgo) => {
                            const text = hallazgo.observaciones_especificas?.toLowerCase() || ''
                            return text.includes('control') || text.includes('controlada') || text.includes('controlado')
                          }).length
                          return (
                            <div key={lote.id_lote} className={`rounded-2xl border-2 transition-all overflow-hidden ${isLoteOpen
                              ? 'bg-emerald-600/5 border-emerald-500/40'
                              : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                              }`}>
                              <div
                                onClick={(e) => { e.stopPropagation(); setSelectedLote(isLoteOpen ? null : lote.id_lote) }}
                                className="flex items-center gap-4 p-4 cursor-pointer"
                              >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isLoteOpen ? 'bg-emerald-600/20' : 'bg-slate-800'
                                  }`}>
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
                                    <span className={`text-[7px] font-black px-2 py-1 rounded-full uppercase ${(lote.siembra_activa || lote.estado_lote === 'ocupado')
                                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                      : lote.estado_lote === 'disponible'
                                        ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                        : lote.estado_lote === 'en_inspeccion'
                                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                          : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                      }`}>
                                      {lote.siembra_activa ? 'Ocupado' : (lote.estado_lote || 'N/A')}
                                    </span>
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
                                  <div className="p-0">
                                    {/* Tabs */}
                                    <div className="flex border-b border-slate-800">
                                      {TRACE_TABS.map((tab) => (
                                        <button
                                          key={tab.id}
                                          onClick={() => setTabForLote(lote.id_lote, tab.id)}
                                          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${
                                            activeTab === tab.id
                                              ? 'text-emerald-400 border-b-2 border-emerald-500'
                                              : 'text-slate-500 hover:text-slate-300'
                                          }`}
                                        >
                                          {tab.label}
                                        </button>
                                      ))}
                                    </div>

                                    {/* Tab Content */}
                                    <div className="p-5">
                                      {activeTab === 'historial' && (
                                        <div className="space-y-4">
                                          {lote.siembra_activa ? (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                                              <div><p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Especie</p><p className="text-sm text-white font-bold italic">{getEspecieNombre(lote.siembra_activa)}</p></div>
                                              <div><p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Variedad</p><p className="text-sm text-white font-bold italic">{getVariedadNombre(lote.siembra_activa)}</p></div>
                                              <div><p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Ciclo</p><span className="text-[8px] font-black px-3 py-1 rounded uppercase bg-blue-500/20 text-blue-400">{lote.siembra_activa.ciclo || 'N/A'}</span></div>
                                              <div><p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Fecha siembra</p><p className="text-sm text-white font-bold">{formatDate(lote.siembra_activa.fecha_siembra)}</p></div>
                                              <div><p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Censo</p><p className="text-sm text-emerald-400 font-black">{lote.siembra_activa.cantidad_plantas || 0} plantas</p></div>
                                              <div><p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Lote</p><p className="text-sm text-white font-bold italic">{lote.nombre_lote}</p></div>
                                              {lote.siembra_activa.edad_dias && (
                                                <div className="col-span-full bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
                                                  <p className="text-[8px] text-emerald-500 font-black uppercase tracking-widest mb-1">Edad Cronológica</p>
                                                  <p className="text-xl text-white font-black italic">{lote.siembra_activa.edad_dias} <span className="text-emerald-500 text-sm">días</span></p>
                                                </div>
                                              )}
                                            </div>
                                           ) : <p className="text-slate-500 italic text-xs">Lote disponible — sin siembra activa registrada.</p>}
                                          
                                          <div className="pt-4 border-t border-slate-800">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Historial Cultivos</p>
                                            {cultivosAnteriores.length === 0 ? <p className="text-[11px] text-slate-600 italic">Sin ciclos anteriores registrados.</p> : (
                                              <div className="space-y-2">
                                                {cultivosAnteriores.map(s => (
                                                  <div key={s.id_siembra} className="flex items-center justify-between p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                                                    <div>
                                                      <p className="text-xs text-white font-bold">{getEspecieNombre(s)} · {getVariedadNombre(s)}</p>
                                                      <p className="text-[10px] text-slate-400">Lote: {lote.nombre_lote} · {s.cantidad_plantas || 0} plantas · {s.ciclo || 'N/A'}</p>
                                                    </div>
                                                    <p className="text-[10px] text-slate-500">{formatDate(s.fecha_siembra)} - {formatDate(s.fecha_fin)} · {getDurationDays(s.fecha_siembra, s.fecha_fin)}</p>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {activeTab === 'plagas' && (
                                        <div className="space-y-3">
                                          {hallazgosHistoricos.length === 0 ? <p className="text-slate-600 italic text-xs">Sin hallazgos fitosanitarios.</p> : (
                                            hallazgosHistoricos.map((h, i) => {
                                              const inspection = inspeccionesHistoricas.find((ins) => String(ins.id_inspeccion) === String(h.id_inspeccion))
                                              const siembra = historial?.siembras.find((s) => String(s.id_siembra) === String(h.siembra_id))
                                              const severity = getSeverity(h.porcentaje_infestacion)
                                              return (
                                                <div key={h.id_detalle || i} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center gap-4">
                                                  <div>
                                                    <p className="text-xs font-bold text-white">{getPlagaNombre(h)}{h.nombre_cientifico ? ` (${h.nombre_cientifico})` : ''}</p>
                                                    <p className="text-[10px] text-slate-500">{formatDate(inspection?.fecha_programada)} · {getEspecieNombre(siembra)} · Lote {lote.nombre_lote}</p>
                                                  </div>
                                                  <div className="text-right space-y-1">
                                                    <span className={`text-[9px] font-black px-2 py-1 rounded border uppercase ${severity.className}`}>{severity.label}</span>
                                                    <p className="text-[10px] text-slate-500">{h.porcentaje_infestacion || 0}% incidencia</p>
                                                  </div>
                                                </div>
                                              )
                                            })
                                          )}
                                          <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-3 text-[10px] font-black uppercase text-slate-400">
                                            <span>Total: {hallazgosHistoricos.length}</span>
                                            <span>Severidad máxima: {hallazgosHistoricos.length ? maxSeverity.label : 'N/A'}</span>
                                            <span>Controladas: {controlledCount}</span>
                                          </div>
                                        </div>
                                      )}

                                      {activeTab === 'inspecciones' && (
                                        <div className="space-y-3">
                                          {inspeccionesHistoricas.length === 0 ? <p className="text-slate-600 italic text-xs">Sin inspecciones anteriores.</p> : (
                                            inspeccionesHistoricas.map(ins => {
                                              const findings = hallazgosHistoricos.filter((h) => String(h.id_inspeccion) === String(ins.id_inspeccion))
                                              const firstCrop = findings[0] ? historial?.siembras.find((s) => String(s.id_siembra) === String(findings[0].siembra_id)) : lote.siembra_activa
                                              return (
                                                <div key={ins.id_inspeccion} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center gap-4">
                                                  <div>
                                                    <p className="text-xs font-bold text-white">#{ins.id_inspeccion} · Inspección fitosanitaria</p>
                                                    <p className="text-[10px] text-slate-500">{formatDate(ins.fecha_programada)} · {ins.tecnico_nombre || 'Técnico no asignado'}</p>
                                                    <p className="text-[10px] text-slate-500">Cultivo: {getEspecieNombre(firstCrop)} · Hallazgos: {findings.length ? findings.map(getPlagaNombre).join(', ') : 'Sin hallazgos'}</p>
                                                  </div>
                                                  <div className="flex items-center gap-3">
                                                    <span className={`text-[9px] font-black px-2 py-1 rounded border uppercase ${getStatusClass(ins.estado)}`}>{ins.estado || 'N/A'}</span>
                                                    <Button size="sm" variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10">
                                                      Ver inspección completa
                                                    </Button>
                                                  </div>
                                                </div>
                                              )
                                            })
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
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
        </div>

        <div className="p-6 bg-slate-950 border-t border-slate-800 flex justify-end">
          <Button
            onClick={onClose}
            className="bg-white text-slate-950 font-black italic uppercase tracking-tighter px-8 h-12 rounded-2xl hover:scale-105 active:scale-95 transition-all"
          >
            ENTENDIDO - CERRAR FICHA
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

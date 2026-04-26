import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MapPin, Calculator, ChevronRight, X, ShieldCheck, UserCheck, Leaf } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  context: any
  onClose: () => void
}

export function DossierModal({ context, onClose }: Props) {
  const [selectedLugar, setSelectedLugar] = useState<number | null>(null)
  const [selectedLote, setSelectedLote] = useState<number | null>(null)

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
        className="relative w-full max-w-5xl bg-slate-900 border-2 border-emerald-500/30 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(16,185,129,0.1)] flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-emerald-600 p-8 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full -mr-20 -mt-20" />
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/30">
              <ShieldCheck className="text-white w-10 h-10" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">
                Dossier Técnico Integral
              </h2>
              <p className="text-emerald-100 font-bold text-xs uppercase tracking-[0.3em] mt-2 opacity-80">
                Protocolo de Identidad y Biología Agraria • ICA
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="relative z-10 w-12 h-12 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-10">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <MapPin className="text-emerald-500 w-5 h-5" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Localización Geográfica</span>
              </div>
              <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800">
                <p className="text-2xl font-black text-white italic uppercase tracking-tighter mb-1">
                  {context?.productor?.ubicacion || 'SIN UBICACIÓN'}
                </p>
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">
                  {context?.nombre_predio_oficial || context?.lugar_nombre}
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
                <Calculator className="text-emerald-500 w-5 h-5" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Dimensiones Operativas</span>
              </div>
              <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800">
                <p className="text-2xl font-black text-white italic uppercase tracking-tighter mb-1">
                  {context?.area_lugar || 0} <span className="text-emerald-500 text-sm">MT²</span>
                </p>
                <p className="text-xs text-slate-400 font-bold tracking-tight uppercase">
                  {context?.lugares_produccion?.length || 0} Lugares · {context?.total_lotes || 0} Lotes
                </p>
              </div>
            </div>
          </div>

          {/* Jerarquía */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">
              LUGARES DE PRODUCCIÓN — HAZ CLIC PARA EXPLORAR
            </h4>
            <div className="space-y-3">
              {context?.lugares_produccion?.map((lugar: any) => {
                const isOpen = selectedLugar === lugar.id_lugar_produccion
                return (
                  <div key={lugar.id_lugar_produccion} className={`rounded-3xl border-2 transition-all overflow-hidden ${
                    isOpen
                      ? 'bg-teal-600/5 border-teal-500/40 shadow-xl shadow-teal-900/10'
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                  }`}>
                    <div
                      onClick={() => { setSelectedLugar(isOpen ? null : lugar.id_lugar_produccion); setSelectedLote(null) }}
                      className="flex items-center gap-5 p-5 cursor-pointer"
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${
                        isOpen ? 'bg-teal-600/20' : 'bg-slate-900 border border-slate-800'
                      }`}>
                        <MapPin className={`w-6 h-6 transition-colors ${isOpen ? 'text-teal-400' : 'text-slate-600'}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white font-black italic uppercase tracking-tight">{lugar.nombre_lugar}</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                          {lugar.area_total || 0} m² · {lugar.lotes?.length || 0} lotes
                          {lugar.es_lugar_inspeccion && <span className="text-teal-400 ml-2">★ INSPECCIÓN ACTUAL</span>}
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
                        {lugar.lotes?.length === 0 ? (
                          <p className="text-slate-600 text-xs italic text-center py-4">Sin lotes registrados.</p>
                        ) : lugar.lotes?.map((lote: any) => {
                          const isLoteOpen = selectedLote === lote.id_lote
                          const hasData = !!lote.siembra_activa
                          return (
                            <div key={lote.id_lote} className={`rounded-2xl border-2 transition-all overflow-hidden ${
                              isLoteOpen
                                ? 'bg-emerald-600/5 border-emerald-500/40'
                                : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                            }`}>
                              <div
                                onClick={(e) => { e.stopPropagation(); setSelectedLote(isLoteOpen ? null : lote.id_lote) }}
                                className="flex items-center gap-4 p-4 cursor-pointer"
                              >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                  isLoteOpen ? 'bg-emerald-600/20' : 'bg-slate-800'
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
                                    <span className={`text-[7px] font-black px-2 py-1 rounded-full uppercase ${
                                      lote.estado_lote === 'disponible'
                                        ? 'bg-emerald-500/10 text-emerald-500'
                                        : 'bg-amber-500/10 text-amber-500'
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
                                      <div>
                                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Especie</p>
                                        <p className="text-sm text-white font-bold italic">{lote.siembra_activa.especie}</p>
                                      </div>
                                      <div>
                                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Variedad</p>
                                        <p className="text-sm text-white font-bold italic">{lote.siembra_activa.variedad || 'Genérica'}</p>
                                      </div>
                                      <div>
                                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Ciclo</p>
                                        <span className={`text-[8px] font-black px-3 py-1 rounded uppercase ${
                                          lote.siembra_activa.ciclo === 'ANUAL'
                                            ? 'bg-blue-500/20 text-blue-400'
                                            : 'bg-orange-500/20 text-orange-400'
                                        }`}>{lote.siembra_activa.ciclo || 'N/A'}</span>
                                      </div>
                                      <div>
                                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Fecha Siembra</p>
                                        <p className="text-sm text-white font-bold">
                                          {new Date(lote.siembra_activa.fecha_siembra).toLocaleDateString('es-ES', {
                                            year: 'numeric', month: 'long', day: 'numeric'
                                          })}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Censo (Plantas)</p>
                                        <p className="text-sm text-emerald-400 font-black">
                                          {lote.siembra_activa.cantidad_plantas} <span className="text-slate-500 font-normal">unidades</span>
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Productor</p>
                                        <p className="text-sm text-white font-bold truncate">{context?.productor?.nombre}</p>
                                      </div>
                                      {lote.siembra_activa.edad_dias && (
                                        <div className="col-span-full bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
                                          <p className="text-[8px] text-emerald-500 font-black uppercase tracking-widest mb-1">
                                            Edad Cronológica del Cultivo
                                          </p>
                                          <p className="text-xl text-white font-black italic">
                                            {lote.siembra_activa.edad_dias} <span className="text-emerald-500 text-sm">días en campo</span>
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="p-5 text-center">
                                      <p className="text-slate-500 italic text-xs">Sin siembra activa registrada.</p>
                                      <p className="text-slate-600 text-[10px] mt-1">Disponible para un nuevo ciclo productivo.</p>
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
        </div>

        <div className="p-8 bg-slate-950/50 border-t border-slate-800 flex justify-end">
          <Button
            onClick={onClose}
            className="bg-white text-slate-950 font-black italic uppercase tracking-tighter px-10 h-14 rounded-2xl hover:scale-105 active:scale-95 transition-all"
          >
            ENTENDIDO - CERRAR FICHA
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

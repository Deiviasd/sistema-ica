import { motion } from "framer-motion"
import { Check, Sprout, Trash2 } from "lucide-react"
import { ContextoInspeccion, EvalItem, FormData, Lote } from "../../types/inspection"
import { getVariedadNombre } from "./utils"

interface LoteSelectorProps {
  activeLotes: Lote[]
  currentEval: EvalItem
  formData: FormData
  context: ContextoInspeccion | null
  onSelectLote: (lote: Lote) => void
  onRequestReset: (loteId: string | number, loteName: string) => void
}

export function LoteSelector({ activeLotes, currentEval, formData, context, onSelectLote, onRequestReset }: LoteSelectorProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-1">
        LOTES DEL PREDIO — SELECCIONA LOS QUE INSPECCIONARÁS HOY
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {activeLotes.map((l: Lote) => (
          <div
            key={l.id_lote}
            onClick={() => onSelectLote(l)}
            className={`self-start rounded-3xl border-2 transition-all flex flex-col text-left cursor-pointer ${String(currentEval.id_lote) === String(l.id_lote)
              ? "gap-4 bg-emerald-600/10 border-emerald-500/50 shadow-xl p-6"
              : "gap-0 bg-muted/40 border-border hover:border-muted-foreground/30 p-5"
              }`}
          >
            <div className="flex justify-between items-start w-full gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${String(currentEval.id_lote) === String(l.id_lote)
                  ? "bg-emerald-500/20 text-emerald-500"
                  : formData.evaluations.some(ev => String(ev.id_lote) === String(l.id_lote))
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : "bg-slate-800 text-slate-600"
                  }`}>
                  <Check className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-foreground font-black italic uppercase tracking-tighter truncate">{l.nombre_lote}</p>
                  <p className="text-[9px] text-muted-foreground font-bold">{l.area} m² · {l.estado_lote?.toUpperCase()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {formData.evaluations.some(ev => String(ev.id_lote) === String(l.id_lote)) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRequestReset(l.id_lote, l.nombre_lote)
                    }}
                    className="p-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:border-rose-500 hover:text-white text-rose-400 rounded-xl transition-all z-10 animate-fade-in"
                    title="Borrar evaluación de este lote"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                {String(currentEval.id_lote) === String(l.id_lote) && (
                  <span className="bg-emerald-500 text-slate-950 font-black text-[8px] px-3 py-1 rounded-full uppercase italic ring-4 ring-emerald-500/10">
                    SELECCIONADO
                  </span>
                )}
              </div>
            </div>

            {String(l.id_lote) === String(currentEval.id_lote) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-600/5 p-5 rounded-2xl border border-emerald-500/20 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2">
                  <Sprout className="w-3 h-3 text-emerald-500" />
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                    Información de Cultivos Registrados
                  </span>
                </div>
                {l.siembra_activa ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[8px] text-slate-500 font-black uppercase">Cultivo (Especie)</p>
                        <p className="text-[11px] text-white font-bold italic">{l.siembra_activa.especie}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-500 font-black uppercase">Variedad</p>
                        <p className="text-[11px] text-white font-bold italic">{getVariedadNombre(l.siembra_activa)}</p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-emerald-500/10 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[8px] text-slate-500 font-black uppercase">Productor</p>
                        <p className="text-[11px] text-white font-bold truncate">{context?.productor?.nombre}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-500 font-black uppercase">Censo (Plantas)</p>
                        <p className="text-[11px] text-emerald-500 font-black tracking-tighter">
                          {l.siembra_activa.cantidad_plantas} UNIDADES
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500 italic text-center py-2">
                    No hay siembras activas registradas en este lote.
                  </p>
                )}
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

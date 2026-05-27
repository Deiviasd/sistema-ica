import { CheckCircle2, History, Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FormData, Lote, Predio } from "../../types/inspection"

interface SummarySidebarProps {
  allPredios: Predio[]
  formData: FormData
  isFinishing: boolean
  onOpenReport: () => void
  handleFinish: (estado: "en_proceso" | "finalizada") => void
}

export function SummarySidebar({ allPredios, formData, isFinishing, onOpenReport, handleFinish }: SummarySidebarProps) {
  const inspectableLotes = allPredios.flatMap((p: Predio) => p.lotes || []).filter((l: Lote) => l.siembra_activa)
  const lotesRevisadosCount = formData.evaluations.filter(ev =>
    inspectableLotes.some((il: Lote) => String(il.id_lote) === String(ev.id_lote))
  ).length
  const totalLotesCount = inspectableLotes.length
  const isComplete = totalLotesCount > 0 && lotesRevisadosCount === totalLotesCount

  return (
    <div className="space-y-6">
      <div className="p-8 bg-card border border-border rounded-[3rem] space-y-8 backdrop-blur-2xl sticky top-8 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-teal-500/10 rounded-xl flex items-center justify-center">
            <History className="text-teal-500 w-5 h-5" />
          </div>
          <h4 className="text-foreground font-black italic uppercase tracking-widest">Resumen de Registro</h4>
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400">
            <span>Progreso de Revisión</span>
            <span className={isComplete ? "text-emerald-400 font-black" : "text-amber-400 font-black"}>
              {lotesRevisadosCount} de {totalLotesCount} lotes
            </span>
          </div>
          <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 p-[2px]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isComplete ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" : "bg-amber-500"}`}
              style={{ width: `${totalLotesCount > 0 ? (lotesRevisadosCount / totalLotesCount) * 100 : 0}%` }}
            />
          </div>
          {!isComplete && (
            <p className="text-[9px] text-amber-500/80 font-bold italic mt-1 leading-tight">
              ⚠️ Se requiere revisar todos los lotes de todos los predios asignados para poder finalizar.
            </p>
          )}
        </div>

        <div className="space-y-4 pt-4 border-t border-border">
          <Button
            onClick={onOpenReport}
            className="w-full h-16 bg-muted border border-border text-foreground hover:bg-muted/80 transition-all font-black uppercase tracking-widest flex items-center justify-center shadow-inner group"
          >
            <svg className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Ver Informe Completo
          </Button>
        </div>

        <div className="pt-6 border-t border-slate-800 flex flex-col gap-4">
          <Button
            disabled={isFinishing}
            onClick={() => handleFinish("en_proceso")}
            className="w-full h-16 bg-transparent border-2 border-slate-800 text-white font-black italic rounded-2xl hover:bg-slate-800 transition-all uppercase tracking-tighter"
          >
            <Save className="w-5 h-5 mr-3" /> Guardar — En Proceso
          </Button>
          <Button
            disabled={isFinishing || formData.evaluations.length === 0 || !isComplete}
            onClick={() => handleFinish("finalizada")}
            className={`w-full h-20 text-white font-black italic text-xl rounded-[2rem] shadow-2xl transition-all uppercase tracking-tighter ${isComplete
              ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40 cursor-pointer animate-pulse"
              : "bg-slate-800 text-slate-500 border border-slate-750 cursor-not-allowed opacity-60 shadow-none"
              }`}
          >
            {isFinishing ? <Loader2 className="animate-spin w-8 h-8" /> : <><CheckCircle2 className="w-7 h-7 mr-3" /> Finalizar Inspección</>}
          </Button>
        </div>
      </div>
    </div>
  )
}

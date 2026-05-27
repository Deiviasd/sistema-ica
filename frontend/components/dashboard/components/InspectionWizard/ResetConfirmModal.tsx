import { AnimatePresence, motion } from "framer-motion"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ResetConfirmModalProps {
  open: boolean
  loteName: string
  onCancel: () => void
  onConfirm: () => void
}

export function ResetConfirmModal({ open, loteName, onCancel, onConfirm }: ResetConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-6">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] max-w-md w-full space-y-6 shadow-2xl ring-1 ring-white/10 text-left"
          >
            <div className="flex items-center gap-4 text-rose-500">
              <div className="w-12 h-12 bg-rose-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-rose-500" />
              </div>
              <div>
                <h3 className="text-white font-black italic uppercase tracking-wider text-base">¿Eliminar Hallazgos?</h3>
                <p className="text-[9px] text-rose-400 font-bold uppercase tracking-widest">Advertencia de seguridad</p>
              </div>
            </div>

            <p className="text-slate-300 text-xs font-semibold leading-relaxed">
              ¿Estás seguro de que deseas eliminar la evaluación del lote <span className="text-white font-bold">{loteName}</span>?
              Se borrarán todas las plagas registradas, plantas afectadas y observaciones de este lote. Esta acción no se puede deshacer.
            </p>

            <div className="flex gap-4 pt-2">
              <Button onClick={onCancel} className="flex-1 h-12 bg-slate-950 border border-slate-800 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors uppercase tracking-wider text-xs">
                Cancelar
              </Button>
              <Button onClick={onConfirm} className="flex-1 h-12 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-colors uppercase tracking-wider text-xs shadow-lg shadow-rose-950/40">
                Sí, Eliminar
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

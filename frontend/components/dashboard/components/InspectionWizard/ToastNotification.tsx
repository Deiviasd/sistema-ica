import { AnimatePresence, motion } from "framer-motion"
import { Check, Info } from "lucide-react"
import { ToastType } from "./types"

interface ToastNotificationProps {
  open: boolean
  message: string
  type: ToastType
}

export function ToastNotification({ open, message, type }: ToastNotificationProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className={`fixed top-8 left-1/2 -translate-x-1/2 z-[110] px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 border backdrop-blur-md transition-colors ${type === "error"
            ? "bg-rose-500 text-white border-rose-400/50 shadow-rose-950/20"
            : "bg-emerald-500 text-slate-950 border-emerald-400/50 shadow-emerald-500/20"
            }`}
        >
          {type === "error" ? <Info className="w-4 h-4 text-white stroke-[3px]" /> : <Check className="w-4 h-4 text-slate-950 stroke-[3px]" />}
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

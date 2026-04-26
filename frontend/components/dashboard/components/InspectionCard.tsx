import { motion } from "framer-motion"
import { MapPin, Calendar, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Inspection } from "../types/inspection"

interface Props {
  inspection: Inspection
  onStart: () => void
}

export function InspectionCard({ inspection, onStart }: Props) {
  const date = new Date(inspection.fecha_programada).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
  const time = new Date(inspection.fecha_programada).toLocaleTimeString('es-ES', {
    hour: '2-digit', minute: '2-digit'
  })

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800 rounded-[2.5rem] p-8 hover:border-emerald-500/50 transition-all group relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[60px] rounded-full" />

      <div className="flex justify-between items-center mb-8">
        <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-800">
          <MapPin className="text-emerald-500 w-6 h-6" />
        </div>
        <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
          inspection.estado === 'programada'
            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
            : inspection.estado === 'en_proceso'
              ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
              : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
        }`}>
          {inspection.estado === 'programada' ? 'PENDIENTE'
            : inspection.estado === 'en_proceso' ? 'EN TRABAJO'
            : 'FINALIZADA'}
        </div>
      </div>

      <h3 className="text-2xl font-black text-white italic tracking-tight mb-4 group-hover:text-emerald-400 transition-colors uppercase">
        {inspection.lugar_produccion?.nombre_lugar}
      </h3>

      <div className="space-y-4 mb-10">
        <div className="flex items-center gap-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
          <Calendar className="w-5 h-5 text-emerald-500" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">FECHA PROGRAMADA</span>
            <span className="text-sm text-white font-bold capitalize">{date} • {time}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
          <MapPin className="w-5 h-5 text-emerald-500" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">LOCALIZACIÓN / REGIÓN</span>
            <span className="text-sm text-white font-bold">{inspection.lugar_produccion?.ubicacion}</span>
          </div>
        </div>
      </div>

      <Button
        onClick={onStart}
        className={`w-full h-16 text-white font-black text-lg rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 ${
          inspection.estado === 'finalizada'
            ? 'bg-slate-800 hover:bg-slate-700 shadow-slate-900/40 text-slate-300'
            : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'
        }`}
      >
        {inspection.estado === 'finalizada' ? (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            VER INSPECCIÓN FINALIZADA
          </>
        ) : (
          <>
            <Play className="w-5 h-5 fill-current" />
            {inspection.estado === 'en_proceso' ? 'CONTINUAR INSPECCIÓN' : 'INICIAR INSPECCIÓN'}
          </>
        )}
      </Button>
    </motion.div>
  )
}

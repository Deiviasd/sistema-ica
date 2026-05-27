import { ClipboardList, Info, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"

interface InspectionHeaderProps {
  isOnline: boolean
  onOpenDossier: () => void
}

export function InspectionHeader({ isOnline, onOpenDossier }: InspectionHeaderProps) {
  return (
    <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-[2rem] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 backdrop-blur-xl">
      <div className="flex items-center gap-5">
        <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
          <Info className="text-amber-500 w-6 h-6" />
        </div>
        <div>
          <p className="text-amber-500/90 text-sm font-bold">
            <span className="font-black italic uppercase">Modo Inspección:</span> Estás en el protocolo de verificación de campo.
          </p>
          <div className="flex items-center gap-2 mt-1">
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Conexión Directa ICA (Online)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <WifiOff className="w-3 h-3 text-amber-400" />
                Modo Campo Activo (Offline)
              </span>
            )}
          </div>
        </div>
      </div>
      <Button
        onClick={onOpenDossier}
        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black italic uppercase tracking-tighter px-8 h-12 rounded-xl shadow-xl shadow-emerald-900/40 border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 transition-all flex gap-3"
      >
        <ClipboardList className="w-5 h-5" />
        Consultar Expediente Técnico
      </Button>
    </div>
  )
}

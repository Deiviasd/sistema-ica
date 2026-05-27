import { Dispatch, SetStateAction } from "react"
import { Calendar, ChevronDown, MapPin } from "lucide-react"
import { ContextoInspeccion, FormData, Inspection, Lote, Predio } from "../../types/inspection"

interface GeneralInfoSectionProps {
  selectedPredioId: number | null
  allPredios: Predio[]
  formData: FormData
  setFormData: Dispatch<SetStateAction<FormData>>
  context: ContextoInspeccion | null
  inspection: Inspection
  onChangePredio: (predioId: number) => void
}

export function GeneralInfoSection({
  selectedPredioId,
  allPredios,
  formData,
  setFormData,
  context,
  inspection,
  onChangePredio
}: GeneralInfoSectionProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-1">DATOS GENERALES</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Seleccione Predio </label>
          <div className="relative">
            <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 w-4 h-4 pointer-events-none" />
            <select
              className="w-full bg-muted/50 border border-border rounded-2xl py-4 pl-14 pr-10 text-foreground font-bold outline-none appearance-none cursor-pointer hover:border-muted-foreground/30 transition-colors"
              value={selectedPredioId ?? ""}
              onChange={(e) => onChangePredio(Number(e.target.value))}
            >
              <option value="" disabled>-- Seleccione Predio --</option>
              {allPredios?.map((predio: Predio) => {
                const predioLotes = predio.lotes || []
                const revLotes = predioLotes.filter((pl: Lote) =>
                  formData.evaluations.some(ev => String(ev.id_lote) === String(pl.id_lote))
                ).length
                return (
                  <option key={predio.id_predio} value={predio.id_predio}>
                    {predio.nombre_predio} ({revLotes}/{predioLotes.length} lotes)
                  </option>
                )
              }) || (
                <option value="">{context?.lugar_nombre || inspection.lugar_produccion?.nombre_lugar}</option>
              )}
            </select>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
              <ChevronDown className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Fecha de Inicio</label>
          <div className="relative">
            <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              disabled
              className="w-full bg-muted/50 border border-border rounded-2xl py-4 pl-14 pr-6 text-foreground font-bold outline-none"
              value={new Date().toLocaleDateString("es-ES")}
            />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">OBSERVACIONES GENERALES DEL PREDIO</label>
        <textarea
          className="w-full bg-muted/50 border border-border rounded-3xl p-8 text-foreground min-h-[120px] outline-none focus:border-teal-500/50 transition-all font-medium leading-relaxed"
          placeholder="Condiciones generales observadas en el predio..."
          value={formData.generalObs}
          onChange={(e) => setFormData({ ...formData, generalObs: e.target.value })}
        />
      </div>
    </div>
  )
}

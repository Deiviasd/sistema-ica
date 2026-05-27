import { motion } from "framer-motion"
import { MapPin, Calendar, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Inspection } from "../types/inspection"

interface Props {
  inspection: Inspection
  onStart: () => void
}

export function InspectionCard({ inspection, onStart }: Props) {
  // Función robusta para parsear la fecha que viene del backend
  let dateObj = new Date();

  if (inspection.fecha_programada) {
    // Si viene como "2026-05-21 08:00:00" (sin T), la reemplazamos para mejor compatibilidad
    const parsedDateStr = inspection.fecha_programada.replace(' ', 'T');

    // Si la fecha termina en 00:00:00Z o no tiene horas especificadas (longitud corta), puede ser que sea solo la fecha
    if (parsedDateStr.length <= 10 || parsedDateStr.endsWith('00:00:00Z')) {
      // Agregamos una hora por defecto para que no se atrase por huso horario (ej: mediodía)
      // Pero si sabemos que el usuario la agendó a una hora, deberíamos usar la hora real.
      // Como parece que el backend puede estar enviando la fecha y hora por separado o solo la fecha truncada,
      // usaremos el valor crudo localmente.
      const justDate = parsedDateStr.split('T')[0];
      // Lo forzamos a local a las 08:00 AM como predeterminado si se perdió la hora
      dateObj = new Date(`${justDate}T08:00:00`);
    } else {
      // Si tiene una hora explícita, parseamos directamente
      dateObj = new Date(parsedDateStr);
    }
  }

  const date = dateObj.toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  // Siempre mostramos la hora en formato 12h (AM/PM)
  const time = dateObj.toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  const isFinalizada = inspection.estado === 'finalizada';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`bg-card backdrop-blur-2xl border rounded-[2.5rem] p-8 transition-all group relative overflow-hidden shadow-sm ${isFinalizada
        ? 'border-slate-800 opacity-80 hover:border-slate-600 grayscale-[0.2]'
        : 'border-border hover:border-emerald-500/50'
        }`}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full ${isFinalizada ? 'bg-slate-500/5' : 'bg-emerald-500/5'}`} />

      <div className="flex justify-between items-center mb-8 relative">
        <div className="group/map relative flex flex-col items-start z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (inspection.lugar_produccion?.ubicacion) {
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(inspection.lugar_produccion.ubicacion)}`, '_blank');
              }
            }}
            title="Abrir ubicación en Google Maps"
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all cursor-pointer hover:scale-110 active:scale-95 shadow-md ${isFinalizada ? 'bg-muted border-border hover:border-muted-foreground/30' : 'bg-muted border-border hover:border-emerald-500 hover:shadow-emerald-500/20'}`}
          >
            <MapPin className={`${isFinalizada ? 'text-slate-500' : 'text-emerald-500'} w-6 h-6`} />
          </button>

          <div className="absolute top-[120%] left-0 opacity-0 group-hover/map:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            <div className="bg-card border border-border text-foreground text-[10px] font-bold px-3 py-2 rounded-xl shadow-xl flex items-center gap-2">
              <MapPin className="w-3 h-3 text-emerald-400" />
              Ver en Google Maps
            </div>
          </div>
        </div>
        <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${inspection.estado === 'programada'
          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
          : inspection.estado === 'en_proceso'
            ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
            : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
          }`}>
          {inspection.estado === 'programada' ? 'PENDIENTE'
            : inspection.estado === 'en_proceso' ? 'EN TRABAJO'
              : 'FINALIZADA'}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Lugar de Producción:</p>
        <h3 className={`text-2xl font-black italic tracking-tight transition-colors uppercase ${isFinalizada ? 'text-muted-foreground/60' : 'group-hover:text-emerald-500'}`}>
          {inspection.lugar_produccion?.nombre_lugar}
        </h3>
      </div>

      <div className="space-y-4 mb-10">
        <div className={`flex items-center gap-4 p-4 rounded-2xl border ${isFinalizada ? 'bg-muted/50 border-border/50' : 'bg-muted border-border'}`}>
          <Calendar className={`w-5 h-5 ${isFinalizada ? 'text-muted-foreground' : 'text-emerald-500'}`} />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">FECHA PROGRAMADA</span>
            <span className={`text-sm font-bold capitalize ${isFinalizada ? 'text-muted-foreground' : ''}`}>{date} {time ? `• ${time}` : ''}</span>
          </div>
        </div>
        <div className={`flex items-center gap-4 p-4 rounded-2xl border ${isFinalizada ? 'bg-muted/50 border-border/50' : 'bg-muted border-border'}`}>
          <MapPin className={`w-5 h-5 ${isFinalizada ? 'text-muted-foreground' : 'text-emerald-500'}`} />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">LOCALIZACIÓN / REGIÓN</span>
            <span className={`text-sm font-bold ${isFinalizada ? 'text-muted-foreground' : ''}`}>{inspection.lugar_produccion?.ubicacion}</span>
          </div>
        </div>
      </div>

      <Button
        onClick={onStart}
        className={`w-full h-16 text-white font-black text-lg rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 ${inspection.estado === 'finalizada'
          ? 'bg-secondary hover:bg-secondary/80 text-secondary-foreground shadow-sm'
          : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
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

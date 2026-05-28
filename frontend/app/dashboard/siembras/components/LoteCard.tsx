import { motion } from "framer-motion"
import { Layers, MapPin, ExternalLink, Trash2, Sprout, Eye } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export interface Siembra {
  id_siembra: number
  fecha_siembra: string
  cantidad_plantas: number
  id_lote: number
  fecha_fin?: string
  nombre_lote?: string
  nombre_lugar?: string
  area?: number
  id_predio?: number
  id_lugar_produccion?: number
  variedad: {
    nombre_variedad: string
    especie: {
      nombre_comun: string
      imagen_url?: string
    }
  }
}

export interface Lote {
  id_lote: number
  nombre_lote: string
  area: number
  estado: 'disponible' | 'ocupado'
  id_lugar_produccion: number
  id_predio: number
  nombre_predio: string
  siembraActiva?: Siembra
}

interface LoteCardProps {
  lote: Lote
  idx: number
  isLocked: boolean
  onSelectSiembra: (lote: Lote) => void
  onAssignSiembra: (lote: Lote) => void
  onDeleteLote: (id_lote: number) => void
  onPreviewImage: (url: string, title: string) => void
}

export function LoteCard({
  lote,
  idx,
  isLocked,
  onSelectSiembra,
  onAssignSiembra,
  onDeleteLote,
  onPreviewImage,
}: LoteCardProps) {
  const isOcupado = lote.estado === 'ocupado'
  const siembra = lote.siembraActiva
  const bgImage = siembra?.variedad?.especie?.imagen_url

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: idx * 0.05 }}
      onClick={() => isOcupado && siembra && onSelectSiembra(lote)}
      className="cursor-pointer select-none group h-full"
    >
      <Card
        className={`relative overflow-hidden transition-all duration-300 border-2 text-left h-full ${isOcupado
            ? 'bg-card border-border hover:border-primary hover:shadow-2xl hover:shadow-primary/5'
            : 'bg-muted/40 border-border border-dashed hover:border-border/80 hover:bg-muted/50'
          }`}
      >
        <CardContent className="p-6 md:p-8 relative z-10 flex flex-col h-full justify-between min-h-[340px]">
          <div className="space-y-6">
            <div className="flex justify-between items-start gap-3">
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all shrink-0 ${siembra
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                    }`}
                >
                  {siembra ? (
                    <Sprout className="w-6 h-6 md:w-7 md:h-7 animate-pulse" />
                  ) : (
                    <Layers className="w-6 h-6 md:w-7 md:h-7" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl md:text-2xl font-black text-foreground italic uppercase tracking-tighter leading-none truncate">
                    {lote.nombre_lote}
                  </h3>
                  <p className="text-muted-foreground font-semibold text-xs md:text-sm uppercase tracking-wider mt-1.5 flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" /> {lote.nombre_predio}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {isLocked && (
                  <span className="px-2.5 py-0.5 text-[8px] md:text-[10px] font-black uppercase rounded-full bg-destructive/20 text-rose-400 border border-destructive/30 backdrop-blur-sm animate-pulse">
                    Congelado
                  </span>
                )}
                <span
                  className={`px-2.5 md:px-3 py-1 text-[10px] md:text-xs font-black uppercase rounded-full border ${isOcupado
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      : 'bg-muted text-muted-foreground border-border'
                    }`}
                >
                  {isOcupado ? 'Ocupado' : 'Disponible'}
                </span>
              </div>
            </div>

            {isOcupado && (
              <div className="space-y-6 text-left">
                {/* Sección Cultivo */}
                <div className="py-4 md:py-6 border-y border-border flex justify-between items-end gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] md:text-xs text-muted-foreground font-black uppercase tracking-[0.2em] mb-2">
                      Cultivo Actual
                    </p>
                    <p className="text-2xl md:text-3xl font-black text-primary uppercase italic leading-none mb-2 truncate">
                      {siembra?.variedad?.especie?.nombre_comun || 'Cargando...'}
                    </p>
                    <p className="text-xs md:text-sm font-bold text-foreground uppercase tracking-tight truncate">
                      Variedad:{' '}
                      <span className="text-muted-foreground font-medium">
                        {siembra?.variedad?.nombre_variedad || 'N/A'}
                      </span>
                    </p>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end justify-between min-h-[84px]">
                    <div>
                      <p className="text-[10px] md:text-xs text-slate-400 font-black uppercase mb-1">
                        Siembra
                      </p>
                      <p className="text-foreground font-bold text-sm md:text-base">
                        {siembra?.fecha_siembra
                          ? new Date(siembra.fecha_siembra).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                          : '---'}
                      </p>
                    </div>
                    {bgImage && (
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onPreviewImage(bgImage, `Cultivo: ${siembra?.variedad?.especie?.nombre_comun || 'Cargando...'}`)
                        }}
                        className="h-10 rounded-xl border border-primary/20 bg-primary/10 hover:bg-primary/20 text-xs font-black uppercase tracking-wider text-primary px-4 flex items-center gap-2 transition-all mt-3 w-full justify-center md:w-auto md:justify-start"
                      >
                        <Eye className="w-4 h-4" /> Foto
                      </Button>
                    )}
                  </div>
                </div>

                {/* Sección Métricas */}
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="p-3 md:p-4 rounded-xl md:rounded-2xl border text-left bg-muted/40 border-border">
                    <p className="text-xl md:text-2xl font-black text-foreground italic leading-none mb-1 drop-shadow-md">
                      {lote.area || 0} m²
                    </p>
                    <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest">
                      Área lote
                    </p>
                  </div>
                  <div className="p-3 md:p-4 rounded-xl md:rounded-2xl border text-left bg-muted/40 border-border">
                    <p className="text-xl md:text-2xl font-black text-foreground italic leading-none mb-1 drop-shadow-md">
                      {siembra?.cantidad_plantas || 0}
                    </p>
                    <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest">
                      Plantas
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {isOcupado ? (
            /* Acción Principal */
            <div className="pt-6">
              <Button
                className="w-full border rounded-xl md:rounded-2xl font-black text-xs uppercase tracking-widest h-12 md:h-14 transition-all group/btn shadow-md bg-muted hover:bg-primary text-foreground hover:text-primary-foreground border-border hover:border-primary"
              >
                <Sprout className="w-4 h-4 md:w-5 md:h-5 mr-3 text-primary group-hover/btn:text-primary-foreground" />
                Gestionar cultivo
                <ExternalLink className="w-3.5 h-3.5 md:w-4 h-4 ml-2 opacity-50 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
              </Button>
            </div>
          ) : (
            <div className="pt-6 space-y-3">
              <Button
                disabled={isLocked}
                onClick={(e) => {
                  e.stopPropagation()
                  onAssignSiembra(lote)
                }}
                className={`w-full bg-muted hover:bg-emerald-600 text-muted-foreground hover:text-white font-black text-xs tracking-widest h-12 md:h-14 rounded-xl md:rounded-2xl transition-all border border-border uppercase shadow-md ${isLocked ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
              >
                {isLocked ? '🔒 Asignación Bloqueada' : 'Asignar Nueva Siembra'}
              </Button>
              <Button
                disabled={isLocked}
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteLote(lote.id_lote)
                }}
                className={`w-full bg-background hover:bg-destructive/10 text-destructive/40 hover:text-destructive font-bold text-xs tracking-widest h-10 md:h-12 rounded-xl md:rounded-2xl transition-all border border-border hover:border-destructive/30 uppercase ${isLocked ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Eliminar Lote
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

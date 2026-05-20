import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { 
  MoreVertical, 
  Trash2, 
  Edit2, 
  TrendingUp, 
  ClipboardCheck,
  Check,
  X,
  AlertTriangle,
  Info,
  MapPin,
  User,
  Phone,
  Mail,
  FileText,
  Building
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

interface LugarCardProps {
  predio: any
  user: any
  onDelete: (id: number) => void
  onUpdate: (id: number, newName: string) => void
  onAgendar: (id: number) => void
  isLocked?: boolean
}

export function LugarCard({ predio, user, onDelete, onUpdate, onAgendar, isLocked = false }: LugarCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempName, setTempName] = useState(predio.nombre_predio)
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleUpdate = () => {
    if (tempName.trim() && tempName !== predio.nombre_predio) {
      onUpdate(predio.id_predio, tempName)
    }
    setIsEditing(false)
  }

  return (
    <div className="h-full relative group/item">
      {/* Efecto de fondo oscuro al hacer hover */}
      <div className="absolute -inset-4 bg-foreground/5 rounded-[2.5rem] opacity-0 group-hover/item:opacity-100 transition-all duration-500 blur-md -z-10" />
      
      <Card className="bg-card border-border hover:border-primary/30 transition-all duration-300 group overflow-hidden h-full relative z-10 rounded-[1.5rem] shadow-xl">
        <CardContent className="p-7">
          {/* Header con Nombre y Menú */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input 
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="bg-muted border-primary/50 h-9"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                  />
                  <Button size="icon" variant="ghost" className="h-9 w-9 text-emerald-400" onClick={handleUpdate}>
                    <Check className="h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <h3 className="text-2xl font-bold tracking-tight truncate group-hover:text-primary transition-colors flex items-center gap-2">
                  {predio.nombre_predio}
                </h3>
              )}
            </div>
            
            <div className="flex items-center gap-1.5">
              {isLocked && (
                <span className="text-[10px] bg-rose-500/10 text-rose-400 font-extrabold px-2.5 py-0.5 rounded-full border border-rose-500/20 flex items-center gap-1 animate-pulse">
                  🔒 CONGELADO
                </span>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted rounded-full transition-colors">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border-border rounded-xl shadow-2xl">
                  <DropdownMenuItem 
                    className="text-foreground hover:bg-muted cursor-pointer py-2 font-semibold flex items-center"
                    onClick={() => setShowDetailsModal(true)}
                  >
                    <Info className="mr-2 h-4 w-4 text-emerald-500" /> Ver Información
                  </DropdownMenuItem>
                  {!isLocked && (
                    <DropdownMenuItem 
                      className="text-rose-400 focus:text-rose-400 focus:bg-rose-400/10 cursor-pointer py-2 font-semibold flex items-center"
                      onClick={() => setShowDeleteAlert(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Eliminar Predio
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-8 font-medium">
            <div className="flex items-center gap-2">
              <IdCard className="w-4 h-4 text-emerald-500" />
              <span className="text-sm">Lugar: {predio.lugar_produccion?.nombre_lugar || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-sm">{predio.area_hectareas} Ha</span>
            </div>
          </div>

          {/* Botones de Acción Estilo Captura */}
          <div className="flex items-center gap-3 mt-auto">
            <Button
              variant="outline"
              disabled={isLocked}
              className={`flex-1 bg-primary/5 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all rounded-xl h-12 font-bold text-sm ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => onAgendar(predio.id_predio)}
            >
              <ClipboardCheck className="w-4 h-4 mr-2" />
              {isLocked ? 'Inspección Activa' : 'Agendar Inspección'}
            </Button>
            <Button
              variant="outline"
              disabled={isLocked}
              className={`flex-1 bg-muted/30 border-muted text-muted-foreground hover:bg-muted transition-all rounded-xl h-12 font-bold text-sm ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="w-4 h-4 mr-2" /> Editar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Advertencia Personalizado (Reemplazo de AlertDialog) */}
      {mounted && showDeleteAlert && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowDeleteAlert(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-card border border-border rounded-[2.5rem] p-8 shadow-2xl z-10"
            >
              <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10 text-rose-500" />
              </div>
              <h3 className="text-2xl font-black text-center mb-4">
                ¿Eliminar este predio?
              </h3>
              <p className="text-muted-foreground text-center mb-8 leading-relaxed">
                Esta acción es irreversible. Se borrarán permanentemente todos los 
                <span className="text-rose-500 font-bold block mt-1">lotes y cultivos asociados.</span>
              </p>
              <div className="space-y-3">
                <Button 
                   variant="destructive"
                  className="w-full h-14 font-black text-lg rounded-2xl transition-all active:scale-95"
                  onClick={() => {
                    onDelete(predio.id_predio);
                    setShowDeleteAlert(false);
                  }}
                >
                  SÍ, ELIMINAR PREDIO
                </Button>
                <Button 
                  variant="ghost"
                  className="w-full h-14 text-muted-foreground hover:bg-muted rounded-2xl font-bold transition-all"
                  onClick={() => setShowDeleteAlert(false)}
                >
                  CANCELAR
                </Button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}

      {/* Modal de Detalles del Predio */}
      {mounted && showDetailsModal && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowDetailsModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-card border border-border rounded-[2.5rem] p-8 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6 border-b border-border pb-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                    <Building className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">Detalles del Predio</h3>
                    <p className="text-xs text-muted-foreground">{predio.nombre_predio}</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 rounded-full hover:bg-muted text-muted-foreground" 
                  onClick={() => setShowDetailsModal(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Contenido scrollable */}
              <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar text-left flex-1">
                
                {/* 1. Información General */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Información General</h4>
                  <div className="grid grid-cols-2 gap-4 bg-muted/30 border border-border/50 rounded-2xl p-4">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Número Predial</span>
                      <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        {predio.numero_predial || 'No registrado'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Área total</span>
                      <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        {predio.area_hectareas} Hectáreas
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Lugar de Producción</span>
                      <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {predio.lugar_produccion?.nombre_lugar || 'No asignado'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Ubicación */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Ubicación Geográfica</h4>
                  <div className="grid grid-cols-2 gap-4 bg-muted/30 border border-border/50 rounded-2xl p-4">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Departamento</span>
                      <span className="text-sm font-semibold text-foreground">
                        {predio.region?.departamento || 'No especificado'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Municipio</span>
                      <span className="text-sm font-semibold text-foreground">
                        {predio.region?.municipio || 'No especificado'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Vereda</span>
                      <span className="text-sm font-semibold text-foreground">
                        {predio.region?.vereda || 'No especificada'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Dirección / Indicaciones</span>
                      <span className="text-sm font-semibold text-foreground block truncate" title={predio.region?.direccion || 'No especificada'}>
                        {predio.region?.direccion || 'No especificada'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Propietario */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Datos del Propietario</h4>
                  <div className="grid grid-cols-2 gap-4 bg-muted/30 border border-border/50 rounded-2xl p-4">
                    <div className="col-span-2">
                      <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Nombre Completo</span>
                      <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {predio.prop_nombre || 'No registrado'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Identificación (NIT/CC)</span>
                      <span className="text-sm font-semibold text-foreground">
                        {predio.prop_identificacion || 'No registrada'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Teléfono</span>
                      <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {predio.prop_telefono || 'No registrado'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Correo Electrónico</span>
                      <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {predio.prop_email || 'No registrado'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="mt-6 border-t border-border pt-4 flex justify-end flex-shrink-0">
                <Button 
                  className="rounded-2xl px-6 h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Cerrar
                </Button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}

function IdCard(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 10h4" />
      <path d="M16 14h4" />
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <path d="M7 15h.01" />
      <path d="M11 8H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h6" />
    </svg>
  )
}

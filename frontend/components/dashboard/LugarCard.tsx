"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  MoreVertical, 
  Trash2, 
  Edit2, 
  TrendingUp, 
  ClipboardCheck,
  Check,
  X,
  AlertTriangle
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
}

export function LugarCard({ predio, user, onDelete, onUpdate, onAgendar }: LugarCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempName, setTempName] = useState(predio.nombre_lugar)
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)

  const handleUpdate = () => {
    if (tempName.trim() && tempName !== predio.nombre_lugar) {
      onUpdate(predio.id_lugar_produccion, tempName)
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
                <h3 className="text-2xl font-bold tracking-tight truncate group-hover:text-primary transition-colors">
                  {predio.nombre_lugar}
                </h3>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted rounded-full transition-colors">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border rounded-xl shadow-2xl">
                <DropdownMenuItem 
                  className="text-rose-400 focus:text-rose-400 focus:bg-rose-400/10 cursor-pointer py-2 font-semibold"
                  onClick={() => setShowDeleteAlert(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar Lugar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Información: Predio y Área */}
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-8 font-medium">
            <div className="flex items-center gap-2">
              <IdCard className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Predio: {predio.nombre_predio || user?.nombre_predio || 'Principal'}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{predio.area_total} m²</span>
            </div>
          </div>

          {/* Botones de Acción Estilo Captura */}
          <div className="flex items-center gap-3 mt-auto">
            <Button
              variant="outline"
              className="flex-1 bg-primary/5 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all rounded-xl h-12 font-bold text-sm"
              onClick={() => onAgendar(predio.id_lugar_produccion)}
            >
              <ClipboardCheck className="w-4 h-4 mr-2" /> Agendar Inspección
            </Button>
            <Button
              variant="outline"
              className="flex-1 bg-muted/30 border-muted text-muted-foreground hover:bg-muted transition-all rounded-xl h-12 font-bold text-sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="w-4 h-4 mr-2" /> Editar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Advertencia Personalizado (Reemplazo de AlertDialog) */}
      <AnimatePresence>
        {showDeleteAlert && (
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
              className="relative w-full max-w-md bg-card border border-border rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10 text-rose-500" />
              </div>
              <h3 className="text-2xl font-black text-center mb-4">
                ¿Eliminar este lugar?
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
                    onDelete(predio.id_lugar_produccion);
                    setShowDeleteAlert(false);
                  }}
                >
                  SÍ, ELIMINAR TODO
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
        )}
      </AnimatePresence>
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

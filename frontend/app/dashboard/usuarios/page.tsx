"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Check, X, ShieldAlert, User, Mail, Calendar, 
  MapPin, Fingerprint, ClipboardCheck, Info,
  ExternalLink, ArrowRight, Briefcase, Users
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface PendingUser {
  id_usuario: string
  nombre: string
  correo: string
  documento: string
  id_rol: string
  id_region: string
  fecha_registro: string
  estado: string
  region?: {
    departamento: string
    municipio: string
    vereda: string
  }
  usuario_predio?: {
    nombre_predio: string
    numero_predial: string
  }[]
}

export default function UsuariosPendientes() {
  const [users, setUsers] = useState<PendingUser[]>([])
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [viewStatus, setViewStatus] = useState<'inactivo' | 'rechazado'>('inactivo')

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/auth/users/by-status?status=${viewStatus}`)
      setUsers(res.data)
    } catch (error) {
      console.error("Error al cargar usuarios", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [viewStatus])

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setIsUpdating(true)
    try {
      await api.patch(`/auth/users/${id}/status`, { estado: newStatus })
      setUsers((prev) => prev.filter((u) => u.id_usuario !== id))
      setSelectedUser(null)
    } catch (error) {
      alert("Error al actualizar usuario")
    } finally {
      setIsUpdating(false)
    }
  }

  const formatRegion = (region: PendingUser['region']) => {
    if (!region) return 'Ubicación no especificada';
    const parts = [];
    if (region.vereda) parts.push(region.vereda);
    if (region.municipio) parts.push(region.municipio);
    if (region.departamento) parts.push(region.departamento);
    return parts.join(', ');
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-muted-foreground animate-pulse font-medium">Sincronizando solicitudes...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <ShieldAlert className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white italic uppercase">
                {viewStatus === 'inactivo' ? 'Gestión de Identidades' : 'Usuarios Rechazados'}
              </h1>
              <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">
                {viewStatus === 'inactivo' 
                  ? 'Verificación y Aprobación Administrativa • ICA Seguridad'
                  : 'Lista de Solicitudes Desestimadas • Módulo de Recuperación'
                }
              </p>
            </div>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 self-start md:self-auto gap-1">
             <button 
                onClick={() => setViewStatus('inactivo')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewStatus === 'inactivo' ? 'bg-primary text-slate-950 italic' : 'text-slate-500 hover:text-slate-300'}`}
             >
                <ClipboardCheck className="w-3.5 h-3.5" /> Pendientes
             </button>
             <button 
                onClick={() => setViewStatus('rechazado')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewStatus === 'rechazado' ? 'bg-rose-600 text-white italic' : 'text-slate-500 hover:text-slate-300'}`}
             >
                <X className="w-3.5 h-3.5" /> Rechazados
             </button>
             <div className="w-[1px] h-6 bg-slate-800 self-center mx-1" />
             <Link href="/dashboard/usuarios/directorio">
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all">
                    <Users className="w-3.5 h-3.5" /> Directorio
                </button>
             </Link>
          </div>
        </div>
      </motion.div>

      {users.length === 0 ? (
        <Card className="bg-slate-900/40 backdrop-blur-xl border-slate-800 border-dashed rounded-[2rem]">
          <CardContent className="flex flex-col items-center justify-center h-80 text-muted-foreground">
            <div className="w-20 h-20 bg-slate-950/50 rounded-full flex items-center justify-center mb-6 border border-slate-800">
               <ClipboardCheck className="w-8 h-8 opacity-20" />
            </div>
            <p className="text-sm font-bold tracking-widest uppercase">Bandeja de Entrada Vacía</p>
            <p className="text-xs mt-2 opacity-50 italic">No hay solicitudes pendientes de validación.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {users.map((user, index) => (
            <motion.div
              key={user.id_usuario}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              layoutId={user.id_usuario}
              onClick={() => setSelectedUser(user)}
              className="group cursor-pointer"
            >
              <Card className={`bg-slate-900/60 backdrop-blur-2xl border-slate-800 transition-all duration-500 rounded-[2rem] overflow-hidden group-hover:translate-y-[-4px] shadow-xl ${viewStatus === 'inactivo' ? 'hover:border-primary/50 hover:shadow-primary/5' : 'hover:border-rose-500/50 hover:shadow-rose-500/5'}`}>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`p-3 rounded-2xl border transition-colors ${viewStatus === 'inactivo' ? 'bg-slate-950 border-slate-800 group-hover:border-primary/30' : 'bg-rose-500/5 border-rose-500/20 group-hover:border-rose-500/40'}`}>
                      {viewStatus === 'inactivo' 
                        ? <User className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
                        : <X className="w-6 h-6 text-rose-500" />
                      }
                    </div>
                    <Badge variant="outline" className={`font-black italic uppercase tracking-tighter text-[10px] py-1 px-3 ${viewStatus === 'inactivo' ? 'bg-primary/5 text-primary border-primary/20' : 'bg-rose-500/5 text-rose-500 border-rose-500/20'}`}>
                      {user.id_rol}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 mb-6">
                    <h3 className="text-xl font-bold text-white tracking-tight leading-tight">{user.nombre}</h3>
                    <p className="text-muted-foreground text-sm flex items-center gap-2">
                       <Mail className="w-3 h-3" /> {user.correo}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-800/50 flex items-center justify-between">
                     <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                        <Calendar className="w-3 h-3" />
                        {new Date(user.fecha_registro).toLocaleDateString()}
                     </div>
                     <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-bold text-xs">
                        Revisar <ArrowRight className="w-3 h-3" />
                     </span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* MODAL DE REVISIÓN DETALLADA */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" 
               onClick={() => !isUpdating && setSelectedUser(null)} 
            />
            
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }} 
               animate={{ opacity: 1, scale: 1, y: 0 }} 
               exit={{ opacity: 0, scale: 0.9, y: 20 }} 
               className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden"
            >
               {/* Banner IQ */}
               <div className="bg-primary/5 border-b border-slate-800 p-8 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                        <ShieldAlert className="text-primary w-7 h-7" />
                     </div>
                     <div>
                        <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Expediente de Usuario</h2>
                        <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em]">Verificación de Idoneidad • Caso #{selectedUser.id_usuario ? String(selectedUser.id_usuario).slice(0, 8) : '---'}</p>
                     </div>
                  </div>
                  <button 
                     onClick={() => setSelectedUser(null)}
                     className="p-3 bg-slate-950 rounded-full text-slate-500 hover:text-white transition-colors"
                  >
                     <X className="w-5 h-5" />
                  </button>
               </div>

               <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto">
                  
                  {/* Datos Básicos */}
                  <div className="grid md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <div className="flex items-center gap-3 text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                           <Info className="w-3 h-3" /> Datos del Solicitante
                        </div>
                        <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800 space-y-6">
                           <div>
                              <p className="text-[9px] text-slate-500 font-black uppercase tracking-tighter mb-1">Nombre Completo</p>
                              <p className="text-white font-bold">{selectedUser.nombre}</p>
                           </div>
                           <div className="space-y-1">
                              <p className="text-[9px] text-slate-500 font-black uppercase tracking-tighter mb-1">Cédula / ID</p>
                              <p className="text-white font-mono flex items-center gap-2">
                                 <Fingerprint className="w-3 h-3 text-primary" /> {selectedUser.documento || 'No registrado'}
                              </p>
                           </div>
                           <div className="space-y-1">
                              <p className="text-[9px] text-slate-500 font-black uppercase tracking-tighter mb-1">Email de Contacto</p>
                              <p className="text-white text-sm break-all">{selectedUser.correo}</p>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <div className="flex items-center gap-3 text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                           <Briefcase className="w-3 h-3" /> Contexto Operativo
                        </div>
                        <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800 space-y-6">
                           <div>
                              <p className="text-[9px] text-slate-500 font-black uppercase tracking-tighter mb-1">Rol Solicitado</p>
                              <Badge className="bg-primary/10 text-primary border-primary/20 font-black italic uppercase text-xs py-1">
                                 {selectedUser.id_rol}
                              </Badge>
                           </div>
                           <div>
                              <p className="text-[9px] text-slate-500 font-black uppercase tracking-tighter mb-1">Ubicación Administrativa</p>
                              <p className="text-white font-bold flex items-start gap-2 leading-tight">
                                 <MapPin className="w-3 h-3 text-primary mt-1 flex-shrink-0" /> {formatRegion(selectedUser.region)}
                              </p>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Datos del Predio (Si es productor) */}
                  {selectedUser.id_rol === 'PRODUCTOR' && (
                     <div className="space-y-4">
                        <div className="flex items-center gap-3 text-emerald-500 font-bold text-[10px] uppercase tracking-widest">
                           <ClipboardCheck className="w-3 h-3" /> Vinculación de Predio Requerida
                        </div>
                        <div className="bg-emerald-500/5 p-6 rounded-3xl border border-emerald-500/20">
                           {selectedUser.usuario_predio && selectedUser.usuario_predio.length > 0 ? (
                              <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                                       <MapPin className="text-emerald-500 w-6 h-6" />
                                    </div>
                                    <div>
                                       <p className="text-[9px] text-emerald-500 font-black uppercase leading-tight italic mb-1">Propiedad Registrada</p>
                                       <p className="text-white font-black text-xl italic uppercase tracking-tighter">
                                          {selectedUser.usuario_predio[0].nombre_predio}
                                       </p>
                                       <p className="text-slate-500 text-xs font-mono">ID Catastral: {selectedUser.usuario_predio[0].numero_predial}</p>
                                    </div>
                                 </div>
                                 <div className="text-right">
                                    <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-3 py-1 rounded-full italic">VALIDADO</span>
                                 </div>
                              </div>
                           ) : (
                              <div className="flex items-center gap-4 text-amber-500">
                                 <Info className="w-5 h-5" />
                                 <p className="text-sm font-medium italic">El usuario no ha suministrado información predial. Review sugerida.</p>
                              </div>
                           )}
                        </div>
                     </div>
                  )}

                  {/* Check de idoneidad */}
                  <div className="p-6 bg-slate-950/80 rounded-3xl border border-slate-800 italic">
                     <p className="text-[10px] text-slate-500 font-black uppercase mb-3 tracking-[0.2em] flex items-center gap-2">
                        <ShieldAlert className="w-3 h-3" /> Recordatorio ICA
                     </p>
                     <p className="text-xs text-slate-400 leading-relaxed">
                        Verifica que el usuario cumpla con los requisitos legales y técnicos para operar en el sistema. 
                        La aprobación le otorgará acceso inmediato a protocolos sensibles de inspección agrícola.
                     </p>
                  </div>
               </div>

               {/* Acciones */}
               <div className="p-8 bg-slate-950/50 border-t border-slate-800 flex gap-4">
                  <Button
                     disabled={isUpdating}
                     onClick={() => handleUpdateStatus(selectedUser.id_usuario, "rechazado")}
                     className="flex-1 h-16 rounded-2xl border-2 border-slate-800 bg-transparent text-slate-500 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/30 transition-all font-black uppercase tracking-widest text-xs"
                  >
                     <X className="w-5 h-5 mr-3" /> Rechazar Solicitud
                  </Button>
                  <Button
                     disabled={isUpdating}
                     onClick={() => handleUpdateStatus(selectedUser.id_usuario, "activo")}
                     className="flex-2 h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-900/40 transition-all font-black uppercase italic tracking-tighter text-lg px-10"
                  >
                     {isUpdating ? "PROCESANDO..." : <><Check className="w-6 h-6 mr-3" /> Aprobar Acceso</>}
                  </Button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

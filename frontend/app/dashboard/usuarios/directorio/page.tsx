"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Users, 
  Search, 
  Filter, 
  ChevronLeft, 
  Mail, 
  User as UserIcon, 
  Shield, 
  MapPin,
  Calendar,
  ExternalLink,
  Trash2,
  ShieldCheck
} from "lucide-react"
import api from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface DirectoryUser {
  id_usuario: string
  nombre: string
  correo: string
  documento: string
  estado: string
  id_rol: string
  region?: {
    departamento?: string
    municipio?: string
    vereda?: string
  }
}

export default function DirectorioUsuarios() {
  const [users, setUsers] = useState<DirectoryUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const res = await api.get("/auth/users/all")
        setUsers(res.data)
      } catch (error) {
        console.error("Error cargando directorio", error)
      } finally {
        setLoading(false)
      }
    }
    fetchAllUsers()
  }, [])

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'activo' ? 'bloqueado' : 'activo'
    setIsUpdating(id)
    try {
      await api.patch(`/auth/users/${id}/status`, { estado: newStatus })
      setUsers(prev => prev.map(u => u.id_usuario === id ? { ...u, estado: newStatus } : u))
    } catch (error) {
      alert("Error al cambiar estado del usuario")
    } finally {
      setIsUpdating(null)
    }
  }

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`¿Estás SEGURO de eliminar permanentemente al usuario "${name}"?\n\nEsta acción no se puede deshacer y borrará toda su información vinculada.`)) return
    
    setIsUpdating(id)
    try {
      await api.delete(`/auth/users/${id}`)
      setUsers(prev => prev.filter(u => u.id_usuario !== id))
    } catch (error) {
      alert("Error al eliminar el usuario. Es posible que tenga registros vinculados (predios, cultivos) que impiden el borrado directo.")
    } finally {
      setIsUpdating(null)
    }
  }

  const filteredUsers = users.filter(user => {
    const nombre = user.nombre || ""
    const correo = user.correo || ""
    const documento = user.documento || ""

    const matchesSearch = 
      nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      correo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      documento.includes(searchTerm)
    
    const matchesRole = roleFilter === "all" || user.id_rol === roleFilter
    const matchesStatus = statusFilter === "all" || user.estado === statusFilter

    return matchesSearch && matchesRole && matchesStatus
  })

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'activo': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      case 'inactivo': return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      case 'rechazado':
      case 'bloqueado': return 'bg-rose-500/10 text-rose-500 border-rose-500/20'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <div className="flex items-center gap-4 mb-2">
          <Link href="/dashboard/usuarios">
            <button className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground">
                <ChevronLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">Directorio Maestro</h1>
            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em]">Base de Datos General de Usuarios • ICA Hub</p>
          </div>
        </div>
      </motion.div>

      {/* Filters & Search */}
      <Card className="bg-card border-border p-4 rounded-3xl backdrop-blur-xl shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, correo o documento..."
              className="w-full bg-muted border-border rounded-2xl py-3 pl-12 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select 
              className="w-full bg-muted border-border rounded-2xl py-3 pl-12 pr-4 text-sm text-foreground appearance-none focus:outline-none"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">Todos los Roles</option>
              <option value="ADMIN_ICA">Administradores</option>
              <option value="TECNICO">Técnicos</option>
              <option value="PRODUCTOR">Productores</option>
            </select>
          </div>
          <div className="relative">
             <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
             <select 
              className="w-full bg-muted border-border rounded-2xl py-3 pl-12 pr-4 text-sm text-foreground appearance-none focus:outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos los Estados</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Pendientes</option>
              <option value="rechazado">Rechazados</option>
              <option value="bloqueado">Bloqueados</option>
            </select>
          </div>
        </div>
      </Card>

      {/* List */}
      <div className="grid gap-4">
        {loading ? (
             <p className="text-center py-20 text-muted-foreground animate-pulse">Cargando base de datos...</p>
        ) : (
          <AnimatePresence>
            {filteredUsers.map((user, idx) => (
              <motion.div
                key={user.id_usuario}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Card className="bg-card border-border hover:border-primary/20 p-4 rounded-3xl transition-all group overflow-hidden relative shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-muted rounded-2xl border border-border flex items-center justify-center group-hover:border-primary/30 transition-colors">
                            <UserIcon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div>
                            <h3 className="font-bold tracking-tight">{user.nombre}</h3>
                            <div className="flex items-center gap-4 mt-1">
                                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                                    <Mail className="w-3 h-3" /> {user.correo}
                                </span>
                                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                                    <Shield className="w-3 h-3" /> {user.id_rol}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {user.region && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted border border-border rounded-xl mr-2">
                                <MapPin className="w-3 h-3 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground font-bold uppercase truncate max-w-[120px]">
                                    {user.region.municipio || "Sin municipio"}, {user.region.departamento || "Sin Depto"}
                                </span>
                            </div>
                        )}
                        <Badge variant="outline" className={`py-1.5 px-3 rounded-xl font-black italic uppercase text-[9px] ${getStatusStyle(user.estado)}`}>
                            {user.estado}
                        </Badge>
                        
                        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-2xl border border-border">
                            <button 
                              onClick={() => handleToggleStatus(user.id_usuario, user.estado)}
                              disabled={isUpdating === user.id_usuario}
                              title={user.estado === 'activo' ? 'Bloquear Usuario' : 'Activar Usuario'}
                              className={`p-2 rounded-xl transition-all ${
                                user.estado === 'activo' 
                                  ? 'hover:bg-rose-500/10 hover:text-rose-500' 
                                  : 'hover:bg-emerald-500/10 hover:text-emerald-500'
                              } text-muted-foreground`}
                            >
                                {isUpdating === user.id_usuario ? (
                                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                ) : user.estado === 'activo' ? (
                                  <ShieldIcon className="w-4 h-4" />
                                ) : (
                                  <ShieldCheck className="w-4 h-4" />
                                )}
                            </button>

                            <button 
                              onClick={() => handleDeleteUser(user.id_usuario, user.nombre)}
                              disabled={isUpdating === user.id_usuario}
                              title="Eliminar permanentemente"
                              className="p-2 hover:bg-rose-500/10 hover:text-rose-600 text-muted-foreground/60 transition-all rounded-xl"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                  </div>
                  {/* Decorative background number */}
                  <span className="absolute -right-4 -bottom-6 text-8xl font-black text-foreground/[0.03] italic pointer-events-none">
                    #{idx + 1}
                  </span>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

function ShieldIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m14.5 9.5-5 5"/><path d="m9.5 9.5 5 5"/></svg>
  )
}

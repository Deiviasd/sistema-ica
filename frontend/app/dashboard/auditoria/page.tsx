"use client"

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Calendar, 
  User as UserIcon, 
  Activity, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  AlertCircle,
  Clock,
  Globe,
  Database
} from "lucide-react"
import { useUserStore } from "@/lib/store"
import api from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

interface AuditLog {
  id: string
  id_usuario: string
  nombre_usuario: string
  correo: string
  rol: string
  tipo_accion: string
  modulo: string
  descripcion: string
  ip: string
  fecha_hora: string
}

export default function AuditoriaPage() {
  const { user } = useUserStore()
  const router = useRouter()

  // State
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [tipoAccion, setTipoAccion] = useState<string>("all")
  const [rolFilter, setRolFilter] = useState<string>("all")
  const [fechaInicio, setFechaInicio] = useState("")
  const [fechaFin, setFechaFin] = useState("")

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20"
      })

      if (search) params.append("search", search)
      if (tipoAccion !== "all") params.append("tipo_accion", tipoAccion)
      if (rolFilter !== "all") params.append("rol", rolFilter)
      if (fechaInicio) params.append("fecha_inicio", fechaInicio)
      if (fechaFin) params.append("fecha_fin", fechaFin)

      const response = await api.get(`/auditoria/logs?${params.toString()}`)
      setLogs(response.data.logs || [])
      setTotal(response.data.total || 0)
    } catch (err: any) {
      console.error("Error fetching logs:", err)
      setError(err.response?.data?.error || "Error al cargar los logs de auditoría")
    } finally {
      setLoading(false)
    }
  }, [page, search, tipoAccion, rolFilter, fechaInicio, fechaFin])

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/dashboard")
      return
    }
    fetchLogs()
  }, [user, router, fetchLogs])

  const getActionBadge = (action: string) => {
    const a = action.toUpperCase()
    if (a.includes("CREATE") || a.includes("LOGIN") || a.includes("APROBAR")) 
      return "bg-emerald-500/15 text-emerald-600 border-emerald-500/20"
    if (a.includes("DELETE") || a.includes("CANCELAR") || a.includes("RECHAZAR")) 
      return "bg-rose-500/15 text-rose-600 border-rose-500/20"
    if (a.includes("UPDATE") || a.includes("PATCH") || a.includes("MODIFICAR")) 
      return "bg-amber-500/15 text-amber-600 border-amber-500/20"
    return "bg-blue-500/15 text-blue-600 border-blue-500/20"
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const isSuspicious = (log: AuditLog) => {
    // Ejemplo: Acción de admin realizada por un técnico (si la lógica fallara en backend)
    // O simplemente resaltar acciones críticas
    if (log.tipo_accion.includes("DELETE") && log.rol !== "admin") return true
    return false
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase text-primary flex items-center gap-2">
            <ShieldCheck className="w-10 h-10" />
            Auditoría de Sistema
          </h1>
          <p className="text-muted-foreground font-medium">
            Control de acciones, seguridad y trazabilidad del sistema ICA.
          </p>
        </div>
        <Button 
          onClick={fetchLogs} 
          variant="outline" 
          className="rounded-full gap-2 border-border bg-card hover:bg-muted/50"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Filters Card */}
      <Card className="bg-card border-border rounded-[2rem] overflow-hidden shadow-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar usuario o acción..." 
                className="pl-10 rounded-xl bg-background border-border"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Action Type */}
            <Select value={tipoAccion} onValueChange={setTipoAccion}>
              <SelectTrigger className="rounded-xl bg-background border-border">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  <SelectValue placeholder="Tipo de Acción" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las acciones</SelectItem>
                <SelectItem value="LOGIN">LOGIN</SelectItem>
                <SelectItem value="USER_UPDATE">ACTUALIZACIÓN USUARIO</SelectItem>
                <SelectItem value="POST_/inspecciones">NUEVA INSPECCIÓN</SelectItem>
                <SelectItem value="DELETE">ELIMINACIÓN</SelectItem>
              </SelectContent>
            </Select>

            {/* Role */}
            <Select value={rolFilter} onValueChange={setRolFilter}>
              <SelectTrigger className="rounded-xl bg-background border-border">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-muted-foreground" />
                  <SelectValue placeholder="Rol" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="tecnico">Técnico</SelectItem>
                <SelectItem value="productor">Productor</SelectItem>
              </SelectContent>
            </Select>

            {/* Date range trigger (simplified for space) */}
            <div className="flex gap-2">
               <Input 
                type="date"
                className="rounded-xl bg-background border-border"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
               <Input 
                type="date"
                className="rounded-xl bg-background border-border"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="bg-card border-border rounded-[2rem] overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase font-bold text-muted-foreground border-b border-border bg-muted/20">
                <tr>
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Acción</th>
                  <th className="px-6 py-4">Módulo</th>
                  <th className="px-6 py-4">Fecha y Hora</th>
                  <th className="px-6 py-4">Dispositivo / IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <AnimatePresence mode="popLayout">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={5} className="px-6 py-8 h-16 bg-muted/5"></td>
                      </tr>
                    ))
                  ) : logs.length > 0 ? (
                    logs.map((log, index) => (
                      <motion.tr 
                        key={log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`${index % 2 === 0 ? 'bg-transparent' : 'bg-muted/30'} hover:bg-primary/5 transition-colors group ${isSuspicious(log) ? 'border-l-4 border-l-rose-500' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground flex items-center gap-1">
                              {log.nombre_usuario}
                              {isSuspicious(log) && <AlertCircle className="w-3 h-3 text-rose-500" />}
                            </span>
                            <span className="text-xs text-muted-foreground">{log.correo}</span>
                            <Badge variant="outline" className="w-fit mt-1 text-[10px] py-0 border-primary/20 text-primary uppercase font-bold tracking-widest">
                              {log.rol}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <Badge className={`w-fit font-bold rounded-md border text-[10px] ${getActionBadge(log.tipo_accion)}`}>
                              {log.tipo_accion}
                            </Badge>
                            <span className="text-xs text-muted-foreground line-clamp-1">{log.descripcion}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Database className="w-3 h-3" />
                            <span className="font-medium uppercase text-[10px] tracking-tight">{log.modulo}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {formatDate(log.fecha_hora)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Globe className="w-3 h-3" />
                            <code>{log.ip}</code>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-2 opacity-40">
                          <Database className="w-12 h-12" />
                          <p className="font-bold text-lg">No se encontraron registros</p>
                          <p className="text-xs">Intenta ajustar los filtros de búsqueda.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Error State */}
          {error && (
            <div className="p-6 bg-rose-500/10 border-t border-rose-500/20 text-rose-600 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">{error}</span>
              </div>
              <Button onClick={fetchLogs} variant="ghost" className="text-rose-600 hover:bg-rose-500/20 rounded-full">
                Reintentar
              </Button>
            </div>
          )}

          {/* Pagination */}
          <div className="p-6 border-t border-border flex items-center justify-between bg-muted/10">
            <p className="text-xs text-muted-foreground">
              Mostrando <span className="font-bold text-foreground">{logs.length}</span> de <span className="font-bold text-foreground">{total}</span> registros
            </p>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-full w-8 h-8 p-0"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-bold w-12 text-center">
                Pág. {page}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-full w-8 h-8 p-0"
                onClick={() => setPage(p => p + 1)}
                disabled={logs.length < 20 || loading}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

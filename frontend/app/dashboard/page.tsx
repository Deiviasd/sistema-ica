"use client"

import { useUserStore } from "@/lib/store"
import Link from "next/link"
import { motion } from "framer-motion"
import { Activity, ArrowRight, ShieldAlert, UserCheck, Users, AlertTriangle, CheckCircle2, Clock, Info } from "lucide-react"
import ProductorDashboard from "@/components/dashboard/ProductorDashboard"
import TecnicoDashboard from "@/components/dashboard/TecnicoDashboard"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

interface SystemUser {
  estado?: string
  id_rol?: string
}

interface AuditLog {
  id: string
  nombre_usuario?: string
  tipo_accion: string
  modulo?: string
  fecha_hora: string
}

interface InspectionReport {
  id_inspeccion: number
  predio_nombre: string
  tecnico_nombre: string
  tecnico_id: number
  fecha_programada: string
  estado: string
}

function AlertasSistema() {
  const [alertas, setAlertas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAlerts() {
      try {
        const [reportRes, usersRes] = await Promise.all([
          api.get<InspectionReport[]>("/inspecciones/reporte"),
          api.get<any[]>("/auth/users/all")
        ])

        const inspections = reportRes.data || []
        const techs = (usersRes.data || []).filter(u => u.id_rol === "TECNICO")
        const now = new Date()
        const newAlerts: any[] = []

        // 🔴 CRÍTICO: Inspecciones programadas/proceso > 7 días
        inspections.forEach(ins => {
          if (ins.estado === "programada" || ins.estado === "en_proceso") {
            const days = (now.getTime() - new Date(ins.fecha_programada).getTime()) / (1000 * 3600 * 24)
            if (days > 7) {
              newAlerts.push({
                severity: "critico",
                title: "Retraso Crítico",
                desc: `Inspección estancada por ${Math.floor(days)} días`,
                entity: ins.predio_nombre,
                href: "/dashboard/reportes"
              })
            }
          }
        })

        // 🟡 ADVERTENCIA: Técnicos sin inspecciones en 30 días
        techs.forEach(t => {
          const hasRecent = inspections.some(ins => 
            ins.tecnico_id === Number(t.id_usuario) && 
            (now.getTime() - new Date(ins.fecha_programada).getTime()) / (1000 * 3600 * 24) < 30
          )
          if (!hasRecent) {
             newAlerts.push({
               severity: "advertencia",
               title: "Técnico Inactivo",
               desc: "Sin actividad en los últimos 30 días",
               entity: t.nombre,
               href: "/dashboard/usuarios/directorio"
             })
          }
        })

        // 🟠 ATENCIÓN: 3+ cancelaciones en 60 días
        const canceledByPredio: Record<string, number> = {}
        inspections.forEach(ins => {
          if (ins.estado === "cancelada") {
             const days = (now.getTime() - new Date(ins.fecha_programada).getTime()) / (1000 * 3600 * 24)
             if (days < 60) {
               canceledByPredio[ins.predio_nombre] = (canceledByPredio[ins.predio_nombre] || 0) + 1
             }
          }
        })

        Object.entries(canceledByPredio).forEach(([predio, count]) => {
          if (count >= 3) {
            newAlerts.push({
              severity: "atencion",
              title: "Alta Cancelación",
              desc: `${count} inspecciones abortadas recientemente`,
              entity: predio,
              href: "/dashboard/reportes"
            })
          }
        })

        setAlertas(newAlerts.slice(0, 3)) // Mostrar top 3
      } catch (e) {
        console.error("Error cargando alertas", e)
      } finally {
        setLoading(false)
      }
    }
    loadAlerts()
  }, [])

  if (loading) return <div className="h-20 bg-card rounded-3xl border border-border animate-pulse mb-6" />

  return (
    <Card className="bg-card border-border rounded-3xl overflow-hidden shadow-sm mb-6">
      <CardContent className="p-0">
        <div className="p-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
               <ShieldAlert className="w-5 h-5 text-primary" />
               <h2 className="text-xl font-black tracking-tight text-foreground uppercase italic">Alertas del Sistema</h2>
            </div>
            {!alertas.length && <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Normal</Badge>}
        </div>
        
        <div className="divide-y divide-border">
          {alertas.length > 0 ? alertas.map((alert, i) => (
            <div key={i} className="p-4 flex items-center gap-4 hover:bg-background transition-colors">
              <div className={`p-2.5 rounded-xl border ${
                alert.severity === 'critico' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                alert.severity === 'advertencia' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                'bg-orange-500/10 border-orange-500/20 text-orange-500'
              }`}>
                {alert.severity === 'critico' ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <p className="font-black text-xs uppercase tracking-tighter text-foreground">{alert.title}</p>
                <p className="text-sm font-bold text-foreground">{alert.entity}</p>
                <p className="text-xs text-muted-foreground">{alert.desc}</p>
              </div>
              <Link href={alert.href}>
                <button className="px-4 py-2 bg-muted hover:bg-border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Ver detalle</button>
              </Link>
            </div>
          )) : (
            <div className="p-10 flex flex-col items-center justify-center text-center space-y-3">
               <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
                  <CheckCircle2 className="w-6 h-6" />
               </div>
               <div>
                  <p className="font-black text-xs uppercase tracking-widest text-foreground">Sistema operando con normalidad</p>
                  <p className="text-xs text-muted-foreground italic">No se detectaron anomalías en el flujo de trabajo.</p>
               </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { user } = useUserStore()
  const [pendingCount, setPendingCount] = useState<number>(0)
  const [activeUsersCount, setActiveUsersCount] = useState<number>(0)
  const [techniciansCount, setTechniciansCount] = useState<number>(0)
  const [todayEventsCount, setTodayEventsCount] = useState<number>(0)
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([])

  useEffect(() => {
    if (user?.role === 'admin') {
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

      Promise.all([
        api.get("/auth/users/by-status?status=inactivo"),
        api.get<SystemUser[]>("/auth/users/all"),
        api.get(`/auditoria/logs?limit=1&fecha_inicio=${encodeURIComponent(startOfDay)}&fecha_fin=${encodeURIComponent(endOfDay)}`),
        api.get("/auditoria/logs?limit=5")
      ])
        .then(([pendingRes, usersRes, todayEventsRes, recentLogsRes]) => {
          const users = Array.isArray(usersRes.data) ? usersRes.data : []
          setPendingCount(Array.isArray(pendingRes.data) ? pendingRes.data.length : 0)
          setActiveUsersCount(users.filter((u) => u.estado === "activo").length)
          setTechniciansCount(users.filter((u) => u.id_rol === "TECNICO").length)
          setTodayEventsCount(todayEventsRes.data?.total || 0)
          setRecentLogs(recentLogsRes.data?.logs || [])
        })
        .catch(err => console.error("Error cargando dashboard admin", err))
    }
  }, [user])

  if (!user) return null

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Buenos días"
    if (hour < 18) return "Buenas tardes"
    return "Buenas noches"
  }

  // Si es productor, mostramos el dashboard especializado
  if (user.role === 'productor') {
    return (
      <div className="space-y-4 md:space-y-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-2 text-left"
        >
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-2 text-foreground">
            {getGreeting()}, <span className="text-primary">{user.nombre}</span>
          </h1>
        </motion.div>

        <ProductorDashboard />
      </div>
    )
  }

  // Si es técnico, mostramos su dashboard especializado (Case-insensitive check)
  if (user.role?.toLowerCase() === 'tecnico') {
    return (
      <div className="space-y-4 md:space-y-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: -0 }}
          className="mb-2 text-left"
        >
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-2 text-foreground">
            Panel Técnico ICA <span className="text-primary">| {user.nombre}</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Registro y control fitosanitario oficial.
          </p>
        </motion.div>

        <TecnicoDashboard />
      </div>
    )
  }

  const getActionBadge = (action: string) => {
    const normalized = action.toUpperCase()
    if (normalized.includes("CREATE") || normalized.includes("LOGIN") || normalized.includes("APROBAR")) {
      return "bg-primary/10 text-primary border-primary/20"
    }
    if (normalized.includes("DELETE") || normalized.includes("CANCELAR") || normalized.includes("RECHAZAR")) {
      return "bg-background text-foreground border-border"
    }
    if (normalized.includes("UPDATE") || normalized.includes("PATCH") || normalized.includes("MODIFICAR")) {
      return "bg-card text-primary border-border"
    }
    return "bg-background text-muted-foreground border-border"
  }

  const formatRelativeTime = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime()
    const minutes = Math.max(0, Math.floor(diffMs / 60000))
    if (minutes < 1) return "hace unos segundos"
    if (minutes === 1) return "hace 1 minuto"
    if (minutes < 60) return `hace ${minutes} minutos`

    const hours = Math.floor(minutes / 60)
    if (hours === 1) return "hace 1 hora"
    if (hours < 24) return `hace ${hours} horas`

    const days = Math.floor(hours / 24)
    if (days === 1) return "hace 1 día"
    return `hace ${days} días`
  }

  const adminKpis = [
    { label: "Aprobaciones Pendientes", value: pendingCount, icon: ShieldAlert, tone: "bg-background text-primary border-border" },
    { label: "Usuarios Activos", value: activeUsersCount, icon: Users, tone: "bg-primary/10 text-primary border-primary/20" },
    { label: "Técnicos Registrados", value: techniciansCount, icon: UserCheck, tone: "bg-background text-foreground border-border" },
    { label: "Eventos Hoy", value: todayEventsCount, icon: Activity, tone: "bg-card text-primary border-border" },
  ]

  return (
    <div className="space-y-8 text-left">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex mb-8"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2 text-foreground">
            {getGreeting()}, <span className="text-primary">{user.nombre}</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Bienvenido a tu panel de control {user.role}.
          </p>
        </div>
      </motion.div>

      {user.role === 'admin' && (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {adminKpis.map((kpi, index) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <Card className="bg-card border-border rounded-3xl shadow-sm h-full">
                  <CardContent className="p-4 md:p-5">
                    <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center mb-4 ${kpi.tone}`}>
                      <kpi.icon className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] md:text-xs uppercase tracking-wider font-bold text-muted-foreground">
                      {kpi.label}
                    </p>
                    <p className="text-3xl md:text-4xl font-black tracking-tight text-foreground mt-1">
                      {kpi.value}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* ⚡ ALERTAS DEL SISTEMA */}
          <AlertasSistema />

          <Card className="bg-card border-border rounded-3xl shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="p-5 border-b border-border flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-foreground">Actividad Reciente</h2>
                  <p className="text-sm text-muted-foreground">Últimos eventos registrados por el sistema.</p>
                </div>
                <Activity className="w-5 h-5 text-primary" />
              </div>

              <div className="divide-y divide-border">
                {recentLogs.length > 0 ? recentLogs.map((log) => (
                  <div key={log.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 hover:bg-background transition-colors">
                    <Badge variant="outline" className={`w-fit rounded-full font-bold text-[10px] uppercase ${getActionBadge(log.tipo_accion)}`}>
                      {log.tipo_accion}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{log.nombre_usuario || "Sistema"}</p>
                      <p className="text-xs text-muted-foreground truncate">Módulo: {log.modulo || "GENERAL"}</p>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(log.fecha_hora)}
                    </p>
                  </div>
                )) : (
                  <div className="p-6 text-sm text-muted-foreground">
                    No hay actividad reciente registrada.
                  </div>
                )}
              </div>

              <Link href="/dashboard/auditoria" className="p-4 flex items-center justify-between text-sm font-bold text-primary border-t border-border hover:bg-background transition-colors">
                Ver auditoría completa
                <ArrowRight className="w-4 h-4" />
              </Link>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/dashboard/usuarios">
              <Card className="bg-card border-border rounded-3xl shadow-sm hover:bg-background hover:shadow-md transition-all h-full">
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-black text-foreground">Usuarios Pendientes</p>
                    <p className="text-sm text-muted-foreground">Solicitudes por revisar</p>
                  </div>
                  <Badge className="bg-destructive text-destructive-foreground rounded-full">
                    {pendingCount}
                  </Badge>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/auditoria">
              <Card className="bg-card border-border rounded-3xl shadow-sm hover:bg-background hover:shadow-md transition-all h-full">
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-black text-foreground">Ver Auditoría Completa</p>
                    <p className="text-sm text-muted-foreground">Log de acciones del sistema</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-primary" />
                </CardContent>
              </Card>
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  )
}

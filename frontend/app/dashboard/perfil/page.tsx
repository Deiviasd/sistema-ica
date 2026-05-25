"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  User,
  Mail,
  Shield,
  Activity,
  FileText,
  MapPin,
  Calendar,
  Building2,
  Sprout,
  ClipboardList,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import api from "@/lib/api"
import { useUserStore } from "@/lib/store"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface FullUserProfile {
  id_usuario: number
  nombre: string
  documento: string
  correo: string
  id_rol: string
  id_region?: number
  estado: string
  rol?: {
    id_rol: string
    nombre_rol: string
    descripcion: string
  }
  region?: {
    id_region: number
    nombre_region: string
    departamento?: string
    municipio?: string
    vereda?: string
    direccion?: string
  }
  foto_perfil?: string
}

export default function ProfilePage() {
  const { user, setUser } = useUserStore()
  const [profileData, setProfileData] = useState<FullUserProfile | null>(null)
  const [lugares, setLugares] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ... (stats states stay the same)

  const handlePhotoClick = () => {
    document.getElementById('avatar-upload')?.click()
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate size (max 1MB for base64 storage)
    if (file.size > 1024 * 1024) {
      setError("La imagen es muy pesada. Máximo 1MB para el perfil.")
      return
    }

    try {
      setIsUploading(true)
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = async () => {
        const base64 = reader.result as string
        
        try {
          await api.patch('/auth/profile', { foto_perfil: base64 })
          
          // Update local state
          if (profileData) {
            setProfileData({ ...profileData, foto_perfil: base64 } as any)
          }
          
          // Update store if needed
          if (user) {
            setUser({ ...user, foto_perfil: base64 })
          }
        } catch (err) {
          setError("Error al guardar la foto en el servidor.")
        } finally {
          setIsUploading(false)
        }
      }
    } catch (err) {
      setIsUploading(false)
      setError("Error al procesar la imagen.")
    }
  }

  // ... (rest of the state and useEffect)

  // Producer Stats
  const [producerStats, setProducerStats] = useState({
    predios: 0,
    inspecciones: 0,
    inspeccionesActivas: 0,
  })

  // Técnico Stats
  const [tecnicoStats, setTecnicoStats] = useState({
    asignadas: 0,
    finalizadas: 0,
    activas: 0,
  })

  // Admin Stats
  const [adminStats, setAdminStats] = useState({
    totalUsuarios: 0,
    activos: 0,
    tecnicos: 0,
  })

  useEffect(() => {
    if (user?.id_usuario) {
      fetchProfileData()
    }
  }, [user])

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch full profile info
      const profileRes = await api.get(`/auth/usuarios/${user?.id_usuario}`)
      setProfileData(profileRes.data)

      // Fetch stats parallel if productor
      if (user?.role === "productor") {
        try {
          const [prediosRes, inspRes, lugaresRes] = await Promise.all([
            api.get("/predios/list"),
            api.get("/inspecciones/reporte"),
            api.get("/predios/lugares-produccion")
          ])

          const activeInsps = (inspRes.data || []).filter(
            (ins: any) => ins.estado === "programada" || ins.estado === "en_proceso"
          )

          setProducerStats({
            predios: prediosRes.data?.length || 0,
            inspecciones: inspRes.data?.length || 0,
            inspeccionesActivas: activeInsps.length || 0,
          })

          setLugares(lugaresRes.data || [])
        } catch (statsErr) {
          console.error("⚠️ Error cargando estadísticas del productor:", statsErr)
        }
      } else if (user?.role === "tecnico") {
        try {
          const res = await api.get("/inspecciones/asignadas")
          const asignadas = res.data || []
          const completadas = asignadas.filter((ins: any) => ins.estado === "finalizada").length
          const activas = asignadas.filter((ins: any) => ins.estado === "programada" || ins.estado === "en_proceso").length

          setTecnicoStats({
            asignadas: asignadas.length,
            finalizadas: completadas,
            activas: activas,
          })
        } catch (statsErr) {
          console.error("⚠️ Error cargando estadísticas del técnico:", statsErr)
        }
      } else if (user?.role === "admin") {
        try {
          const usersRes = await api.get("/auth/users/all")
          const users = usersRes.data || []
          const activeUsers = users.filter((u: any) => u.estado === "activo").length
          const tecnicos = users.filter((u: any) => u.id_rol === "TECNICO").length

          setAdminStats({
            totalUsuarios: users.length,
            activos: activeUsers,
            tecnicos: tecnicos,
          })
        } catch (statsErr) {
          console.error("⚠️ Error cargando estadísticas del admin:", statsErr)
        }
      }
    } catch (err: any) {
      console.error("Error fetching profile details:", err)
      setError("No se pudo cargar la información completa del perfil. Por favor, intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-teal-500 animate-spin" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Cargando Perfil del Usuario...</p>
      </div>
    )
  }

  // Fallback to basic session user if API fails
  const displayName = profileData?.nombre || user?.nombre || "Usuario del Sistema"
  const displayEmail = profileData?.correo || user?.email || ""
  const displayDocument = profileData?.documento || user?.identificacion || "No registrado"
  const displayRole = profileData?.rol?.nombre_rol || (user?.role === "productor" ? "Productor Agrícola" : user?.role === "tecnico" ? "Técnico Certificador" : "Administrador ICA")
  const displayStatus = profileData?.estado || "activo"
  const initials = displayName.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || "US"

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-border pb-5 gap-4">
        <div className="space-y-1">
          <Link href="/dashboard" className="flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver al Inicio
          </Link>
          <h1 className="text-2xl md:text-3xl font-black italic tracking-tight text-foreground uppercase leading-none">Mi Perfil</h1>
          <p className="text-[10px] md:text-xs text-muted-foreground font-bold uppercase">Gestión y visualización de credenciales y activos registrados ante el ICA.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-sm font-bold">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: HERO USER CARD */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-card/40 border-2 border-border rounded-3xl overflow-hidden shadow-xl relative">
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-primary/20 to-indigo-600/20 blur-xl -z-10" />
              <CardContent className="px-4 py-8 flex flex-col items-center text-center space-y-5">
                {/* Avatar */}
                <div 
                  onClick={handlePhotoClick}
                  className="group relative w-28 h-28 rounded-full bg-gradient-to-br from-primary to-indigo-600 p-1 shadow-lg shadow-primary/20 cursor-pointer hover:scale-105 transition-all"
                >
                  <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                    {profileData?.foto_perfil ? (
                      <img src={profileData.foto_perfil} className="w-full h-full object-cover" alt="Profile" />
                    ) : (
                      <span className="text-3xl font-black italic tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">{initials}</span>
                    )}
                  </div>
                  
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white scale-[0.98]">
                    {isUploading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <Shield className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-black uppercase tracking-tighter">Cambiar</span>
                      </>
                    )}
                  </div>
                  
                  <input 
                    id="avatar-upload"
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handlePhotoUpload} 
                  />
                </div>

                {/* Name & Role */}
                <div className="space-y-2">
                  <h2 className="text-xl font-black italic tracking-tight text-foreground uppercase leading-snug">{displayName}</h2>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Badge className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${displayStatus === 'activo'
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${displayStatus === 'activo' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                      {displayStatus}
                    </Badge>
                  </div>
                </div>

                <div className="w-full border-t border-border/80 my-4" />

                {/* Stats quick overview */}
                <div className="w-full bg-muted/40 p-3 rounded-xl border border-border/60 text-left">
                  <p className="text-[10px] text-muted-foreground font-black uppercase">Rol Sistema</p>
                  <p className="text-foreground text-sm font-bold capitalize">{user?.role || 'Productor'}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Notice Card */}
          <Card className="bg-muted/30 border border-border/60 rounded-3xl p-5">
            <div className="flex items-start gap-3 text-left">
              <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-foreground text-xs font-black uppercase tracking-wider">Entorno Protegido</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">Este perfil está encriptado con protocolos SSL y resguardado bajo control de acceso de roles del Instituto Colombiano Agropecuario (ICA).</p>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: CORE PROFILE INFO & STATS */}
        <div className="lg:col-span-2 space-y-8">
          {/* General Information Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="bg-card/40 border-2 border-border rounded-3xl overflow-hidden shadow-xl text-left">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="text-md font-black italic tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" /> Información Personal
                </h3>
              </div>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre Completo */}
                <div className="space-y-1">
                  <p className="text-[10px] text-primary font-black uppercase tracking-widest flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Nombre Completo
                  </p>
                  <p className="text-foreground font-bold text-sm bg-muted/40 border border-border/80 p-3 rounded-2xl">
                    {displayName}
                  </p>
                </div>

                {/* Identificación */}
                <div className="space-y-1">
                  <p className="text-[10px] text-primary font-black uppercase tracking-widest flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Número de Documento (Cédula)
                  </p>
                  <p className="text-foreground font-bold text-sm bg-muted/40 border border-border/80 p-3 rounded-2xl">
                    {displayDocument}
                  </p>
                </div>

                {/* Correo */}
                <div className="space-y-1 md:col-span-2">
                  <p className="text-[10px] text-primary font-black uppercase tracking-widest flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Correo Electrónico
                  </p>
                  <p className="text-foreground font-bold text-sm bg-muted/40 border border-border/80 p-3 rounded-2xl font-mono">
                    {displayEmail}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Producer Specific Stats & Assets Dashboard */}
          {user?.role === "productor" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                {/* Card Predios */}
                <Card className="bg-card/40 border border-border rounded-2xl hover:border-primary/30 transition-all shadow-md">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3.5 bg-primary/10 rounded-2xl text-primary">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Predios Registrados</p>
                      <h4 className="text-xl md:text-2xl font-black italic tracking-tight text-foreground">{producerStats.predios} <span className="text-xs font-bold not-italic text-muted-foreground">Predios</span></h4>
                    </div>
                  </CardContent>
                </Card>

                {/* Card Inspecciones */}
                <Card className="bg-card/40 border border-border rounded-2xl hover:border-indigo-500/30 transition-all shadow-md">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3.5 bg-indigo-500/10 rounded-2xl text-indigo-500">
                      <ClipboardList className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Visitas Técnicas Totales</p>
                      <h4 className="text-xl md:text-2xl font-black italic tracking-tight text-foreground">{producerStats.inspecciones} <span className="text-xs font-bold not-italic text-muted-foreground">Inspecciones</span></h4>
                    </div>
                  </CardContent>
                </Card>

                {/* Card Inspecciones Activas */}
                <Card className="bg-card/40 border border-border rounded-2xl hover:border-rose-500/30 transition-all shadow-md">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3.5 bg-rose-500/10 rounded-2xl text-rose-500 relative">
                      <Sprout className="w-6 h-6 animate-pulse" />
                      {producerStats.inspeccionesActivas > 0 && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-background" />
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Inspecciones Activas</p>
                      <h4 className="text-xl md:text-2xl font-black italic tracking-tight text-foreground">{producerStats.inspeccionesActivas} <span className="text-xs font-bold not-italic text-muted-foreground">Activas</span></h4>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* Técnico Specific Stats & Assets Dashboard */}
          {user?.role === "tecnico" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card Inspecciones Asignadas */}
                <Card className="bg-card/40 border border-border rounded-2xl hover:border-teal-500/30 transition-all shadow-md">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3.5 bg-teal-500/10 rounded-2xl text-teal-500">
                      <ClipboardList className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Inspecciones Asignadas Totales</p>
                      <h4 className="text-xl md:text-2xl font-black italic tracking-tight text-foreground">{tecnicoStats.asignadas} <span className="text-xs font-bold not-italic text-muted-foreground">Asignadas</span></h4>
                    </div>
                  </CardContent>
                </Card>

                {/* Card Inspecciones Realizadas */}
                <Card className="bg-card/40 border border-border rounded-2xl hover:border-emerald-500/30 transition-all shadow-md">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3.5 bg-emerald-500/10 rounded-2xl text-emerald-500">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Inspecciones Realizadas</p>
                      <h4 className="text-xl md:text-2xl font-black italic tracking-tight text-foreground">{tecnicoStats.finalizadas} <span className="text-xs font-bold not-italic text-muted-foreground">Realizadas</span></h4>
                    </div>
                  </CardContent>
                </Card>

                {/* Card Inspecciones Activas / Pendientes */}
                <Card className="bg-card/40 border border-border rounded-2xl hover:border-amber-500/30 transition-all shadow-md">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3.5 bg-amber-500/10 rounded-2xl text-amber-500 relative">
                      <Activity className="w-6 h-6 animate-pulse" />
                      {tecnicoStats.activas > 0 && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-background" />
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Inspecciones Activas</p>
                      <h4 className="text-xl md:text-2xl font-black italic tracking-tight text-foreground">{tecnicoStats.activas} <span className="text-xs font-bold not-italic text-muted-foreground">Activas</span></h4>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Región de Control / Jurisdicción */}
              <div className="space-y-4 text-left">
                <h3 className="text-xs font-black italic tracking-widest text-muted-foreground uppercase flex items-center gap-2 mt-6">
                  <MapPin className="w-4 h-4 text-primary" /> Area Geográfica de Control ICA
                </h3>

                <Card className="bg-card/40 border-2 border-border rounded-3xl overflow-hidden shadow-lg hover:border-primary/20 transition-all text-left">
                  <div className="bg-gradient-to-r from-primary/10 to-indigo-600/10 px-6 py-4 border-b border-border/80 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-lg font-black italic tracking-tight text-foreground uppercase">Región de Asignación Fitosanitaria</h4>
                      </div>
                    </div>
                    <Badge className="bg-background/80 text-primary border border-primary/20 font-mono text-xs px-3 py-1 rounded-full">
                      Técnico Oficial ICA
                    </Badge>
                  </div>

                  <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Departamento</h5>
                      <p className="text-foreground text-sm font-bold bg-muted/40 p-3 rounded-2xl border border-border/50">
                        {profileData?.region?.departamento}
                      </p>
                    </div>

                    <div>
                      <h5 className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Municipio Sede</h5>
                      <p className="text-foreground text-sm font-bold bg-muted/40 p-3 rounded-2xl border border-border/50">
                        {profileData?.region?.municipio}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* Admin Specific Stats & Assets Dashboard */}
          {user?.role === "admin" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card Usuarios Registrados */}
                <Card className="bg-slate-900/30 border border-slate-800/80 rounded-2xl hover:border-teal-500/30 transition-all">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3.5 bg-teal-500/10 rounded-2xl text-teal-400">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Usuarios Registrados</p>
                      <h4 className="text-2xl font-black italic tracking-tight text-white">{adminStats.totalUsuarios} <span className="text-xs font-bold not-italic text-slate-500">Usuarios</span></h4>
                    </div>
                  </CardContent>
                </Card>

                {/* Card Usuarios Activos */}
                <Card className="bg-slate-900/30 border border-slate-800/80 rounded-2xl hover:border-emerald-500/30 transition-all">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3.5 bg-emerald-500/10 rounded-2xl text-emerald-400">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Cuentas Activas</p>
                      <h4 className="text-2xl font-black italic tracking-tight text-white">{adminStats.activos} <span className="text-xs font-bold not-italic text-slate-500">Activas</span></h4>
                    </div>
                  </CardContent>
                </Card>

                {/* Card Técnicos Registrados */}
                <Card className="bg-slate-900/30 border border-slate-800/80 rounded-2xl hover:border-indigo-500/30 transition-all">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3.5 bg-indigo-500/10 rounded-2xl text-indigo-400">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Técnicos Oficiales</p>
                      <h4 className="text-2xl font-black italic tracking-tight text-white">{adminStats.tecnicos} <span className="text-xs font-bold not-italic text-slate-500">Técnicos</span></h4>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Panel de Control de Administración */}
              <div className="space-y-4 text-left">
                <h3 className="text-xs font-black italic tracking-widest text-muted-foreground uppercase flex items-center gap-2 mt-6">
                  <Shield className="w-4 h-4 text-primary" /> Panel de Control de Seguridad del Sistema
                </h3>

                <Card className="bg-card/40 border-2 border-border rounded-3xl overflow-hidden shadow-lg hover:border-primary/20 transition-all text-left">
                  <div className="bg-gradient-to-r from-primary/10 to-indigo-600/10 px-6 py-4 border-b border-border/80 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-lg font-black italic tracking-tight text-foreground uppercase text-left">Autorización del Sistema (Nivel Root)</h4>
                      </div>
                    </div>
                    <Badge className="bg-background/80 text-rose-500 border border-rose-500/20 font-mono text-xs px-3 py-1 rounded-full">
                      Administrador Global
                    </Badge>
                  </div>

                  <CardContent className="p-6 space-y-4 text-left">
                    <div>
                      <h5 className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Nivel de Acceso</h5>
                      <p className="text-foreground text-xs font-bold bg-muted/30 p-3 rounded-2xl border border-border/50">
                        Administración del Sistema ICA - Control Total del Registro de Predios, Usuarios e Inspecciones Fitosanitarias.
                      </p>
                    </div>

                    <div>
                      <h5 className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Funciones del Rol</h5>
                      <ul className="text-muted-foreground text-xs font-semibold bg-muted/30 p-4 rounded-2xl border border-border/50 space-y-1.5 list-disc list-inside">
                        <li>Aprobación y denegación de cuentas de técnicos y productores.</li>
                        <li>Auditoría forense de todas las operaciones realizadas en el sistema.</li>
                        <li>Configuración geográfica global de regiones y municipios de control.</li>
                        <li>Gestión y catalogación de plagas fitosanitarias.</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* Lugar de Producción / Empresas Registradas */}
          {user?.role === "productor" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="space-y-4 text-left"
            >
              <h3 className="text-xs font-black italic tracking-widest text-slate-500 uppercase flex items-center gap-2 mt-4">
                <Building2 className="w-4 h-4 text-teal-500" /> Lugar de Producción / Empresa Registrada
              </h3>

              {lugares.length === 0 ? (
                <Card className="bg-muted/20 border border-border rounded-2xl p-6 text-center">
                  <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-bold text-muted-foreground">No tienes lugares de producción registrados.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Registra tu empresa o finca en la sección de Predios para verla aquí.</p>
                </Card>
              ) : (
                <div className="space-y-6">
                  {lugares.map((lugar: any) => {
                    const linkedPredios = lugar.predio || [];
                    const totalHectareas = linkedPredios.reduce((sum: number, p: any) => sum + (Number(p.area_hectareas) || 0), 0);

                    return (
                      <Card key={lugar.id_lugar_produccion} className="bg-card/40 border-2 border-border rounded-3xl overflow-hidden shadow-lg hover:border-primary/20 transition-all text-left">
                        {/* Strip Superior con Degradado */}
                        <div className="bg-gradient-to-r from-primary/10 to-indigo-600/10 px-6 py-4 border-b border-border/80 flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                              <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-lg font-black italic tracking-tight text-foreground uppercase">{lugar.nombre_lugar}</h4>
                            </div>
                          </div>
                          <Badge className="bg-background/80 text-primary border border-primary/20 font-mono text-xs px-3 py-1 rounded-full">
                            Registro ICA: {lugar.numero_registro || "Pendiente Asignación"}
                          </Badge>
                        </div>

                        {/* Detalles de la Empresa */}
                        <CardContent className="p-6 space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Propietario / Empresa info */}
                            <div className="space-y-4">
                              <div>
                                <h5 className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Empresa / Productor Responsable</h5>
                                <p className="text-foreground text-sm font-bold bg-muted/30 p-3 rounded-2xl border border-border/55">
                                  {displayName}
                                </p>
                              </div>

                              <div>
                                <h5 className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Identificación del Propietario</h5>
                                <p className="text-foreground text-sm font-bold bg-muted/30 p-3 rounded-2xl border border-border/55">
                                  {displayDocument}
                                </p>
                              </div>
                            </div>

                            {/* Ubicación y Hectáreas */}
                            <div className="space-y-4">
                              <div>
                                <h5 className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Cobertura Física Total</h5>
                                <p className="text-foreground text-sm font-bold bg-muted/30 p-3 rounded-2xl border border-border/55">
                                  {totalHectareas} Hectáreas en {linkedPredios.length} Predio(s)
                                </p>
                              </div>

                              <div>
                                <h5 className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Departamento / Municipio Principal</h5>
                                <p className="text-foreground text-sm font-bold bg-muted/30 p-3 rounded-2xl border border-border/55">
                                  {linkedPredios[0]?.region?.departamento || profileData?.region?.departamento || "N/A"} - {linkedPredios[0]?.region?.municipio || profileData?.region?.municipio || "N/A"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Listado de Predios Vinculados */}
                          {linkedPredios.length > 0 && (
                            <div className="space-y-3 pt-2">
                              <h5 className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Predios de Terreno Vinculados a esta Empresa</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {linkedPredios.map((predio: any) => (
                                  <div key={predio.id_predio} className="bg-muted/40 border border-border p-4 rounded-2xl hover:border-primary/40 transition-all shadow-sm space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-black uppercase italic tracking-tight text-foreground">{predio.nombre_predio}</span>
                                      <Badge className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[9px] font-black uppercase">
                                        {predio.area_hectareas} Ha
                                      </Badge>
                                    </div>
                                    <div className="text-[11px] text-slate-500 space-y-1">
                                      <p className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 font-bold inline" /> Numero Predial: <span className="font-mono text-slate-400 font-semibold">{predio.numero_predial || "No registrado"}</span></p>
                                      {(() => {
                                        const veredaName = predio.region?.vereda?.trim() || (profileData?.region as any)?.vereda?.trim() || "Vereda General";
                                        const municipioName = predio.region?.municipio || (profileData?.region as any)?.municipio || "Manzanares";
                                        const departamentoName = predio.region?.departamento || (profileData?.region as any)?.departamento || "Caldas";
                                        return (
                                          <p className="flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5 inline" />
                                            Ubicación: <span className="text-slate-400 font-semibold">{veredaName} ({municipioName} - {departamentoName})</span>
                                          </p>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

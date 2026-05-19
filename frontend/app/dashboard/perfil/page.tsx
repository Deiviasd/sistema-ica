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
  }
}

export default function ProfilePage() {
  const { user } = useUserStore()
  const [profileData, setProfileData] = useState<FullUserProfile | null>(null)
  const [lugares, setLugares] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Producer Stats
  const [stats, setStats] = useState({
    predios: 0,
    inspecciones: 0,
    inspeccionesActivas: 0,
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

          setStats({
            predios: prediosRes.data?.length || 0,
            inspecciones: inspRes.data?.length || 0,
            inspeccionesActivas: activeInsps.length || 0,
          })

          setLugares(lugaresRes.data || [])
        } catch (statsErr) {
          console.error("⚠️ Error cargando estadísticas del productor:", statsErr)
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
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <Link href="/dashboard" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-teal-400 transition-colors mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver al Inicio
          </Link>
          <h1 className="text-3xl font-black italic tracking-tight text-white uppercase leading-none">Mi Perfil</h1>
          <p className="text-xs text-slate-500 font-bold uppercase">Gestión y visualización de credenciales y activos registrados ante el ICA.</p>
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
            <Card className="bg-slate-900/40 border-2 border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-teal-600/20 to-indigo-600/20 blur-xl -z-10" />
              <CardContent className="px-1 py-1 flex flex-col items-center text-center space-y-5">
                {/* Avatar */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-500 to-indigo-600 p-1 shadow-lg shadow-teal-500/10">
                  <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                    <span className="text-3xl font-black italic tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-400">{initials}</span>
                  </div>
                </div>

                {/* Name & Role */}
                <div className="space-y-2">
                  <h2 className="text-xl font-black italic tracking-tight text-white uppercase leading-snug">{displayName}</h2>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Badge className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${displayStatus === 'activo'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${displayStatus === 'activo' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      {displayStatus}
                    </Badge>
                  </div>
                </div>

                <div className="w-full border-t border-slate-800/80 my-4" />

                {/* Stats quick overview */}
                <div className="w-full bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                  <p className="text-[10px] text-slate-500 font-black uppercase">Rol Sistema</p>
                  <p className="text-white tet-xs font-bold capitalize">{user?.role || 'Productor'}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Notice Card */}
          <Card className="bg-slate-950/30 border border-slate-900 rounded-3xl p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-white text-xs font-black uppercase tracking-wider">Entorno Protegido</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">Este perfil está encriptado con protocolos SSL y resguardado bajo control de acceso de roles del Instituto Colombiano Agropecuario (ICA).</p>
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
            <Card className="bg-slate-900/40 border-2 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-md font-black italic tracking-widest text-slate-400 uppercase flex items-center gap-2">
                  <User className="w-5 h-5 text-teal-500" /> Información Personal
                </h3>
              </div>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre Completo */}
                <div className="space-y-1">
                  <p className="text-[10px] text-teal-500 font-black uppercase tracking-widest flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Nombre Completo
                  </p>
                  <p className="text-white font-bold text-sm bg-slate-950/40 border border-slate-800/80 p-3 rounded-2xl">
                    {displayName}
                  </p>
                </div>

                {/* Identificación */}
                <div className="space-y-1">
                  <p className="text-[10px] text-teal-500 font-black uppercase tracking-widest flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Número de Documento (Cédula)
                  </p>
                  <p className="text-white font-bold text-sm bg-slate-950/40 border border-slate-800/80 p-3 rounded-2xl">
                    {displayDocument}
                  </p>
                </div>

                {/* Correo */}
                <div className="space-y-1 md:col-span-2">
                  <p className="text-[10px] text-teal-500 font-black uppercase tracking-widest flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Correo Electrónico
                  </p>
                  <p className="text-white font-bold text-sm bg-slate-950/40 border border-slate-800/80 p-3 rounded-2xl font-mono">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card Predios */}
                <Card className="bg-slate-900/30 border border-slate-800/80 rounded-2xl hover:border-teal-500/30 transition-all">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3.5 bg-teal-500/10 rounded-2xl text-teal-400">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Predios Registrados</p>
                      <h4 className="text-2xl font-black italic tracking-tight text-white">{stats.predios} <span className="text-xs font-bold not-italic text-slate-500">Predios</span></h4>
                    </div>
                  </CardContent>
                </Card>

                {/* Card Inspecciones */}
                <Card className="bg-slate-900/30 border border-slate-800/80 rounded-2xl hover:border-indigo-500/30 transition-all">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3.5 bg-indigo-500/10 rounded-2xl text-indigo-400">
                      <ClipboardList className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Visitas Técnicas</p>
                      <h4 className="text-2xl font-black italic tracking-tight text-white">{stats.inspecciones} <span className="text-xs font-bold not-italic text-slate-500">Inspecciones</span></h4>
                    </div>
                  </CardContent>
                </Card>

                {/* Card Inspecciones Activas */}
                <Card className="bg-slate-900/30 border border-slate-800/80 rounded-2xl hover:border-rose-500/30 transition-all">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3.5 bg-rose-500/10 rounded-2xl text-rose-400 relative">
                      <Sprout className="w-6 h-6 animate-pulse" />
                      {stats.inspeccionesActivas > 0 && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-slate-950" />
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Inspecciones Activas</p>
                      <h4 className="text-2xl font-black italic tracking-tight text-white">{stats.inspeccionesActivas} <span className="text-xs font-bold not-italic text-slate-500">Activas</span></h4>
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
                <Card className="bg-slate-900/20 border border-slate-800/80 rounded-2xl p-6 text-center">
                  <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-400">No tienes lugares de producción registrados.</p>
                  <p className="text-xs text-slate-600 mt-1">Registra tu empresa o finca en la sección de Predios para verla aquí.</p>
                </Card>
              ) : (
                <div className="space-y-6">
                  {lugares.map((lugar: any) => {
                    const linkedPredios = lugar.predio || [];
                    const totalHectareas = linkedPredios.reduce((sum: number, p: any) => sum + (Number(p.area_hectareas) || 0), 0);

                    return (
                      <Card key={lugar.id_lugar_produccion} className="bg-slate-900/40 border-2 border-slate-800 rounded-3xl overflow-hidden shadow-lg hover:border-slate-700/80 transition-all text-left">
                        {/* Strip Superior con Degradado */}
                        <div className="bg-gradient-to-r from-teal-600/10 to-indigo-600/10 px-6 py-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-teal-500/10 rounded-xl text-teal-400">
                              <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-lg font-black italic tracking-tight text-white uppercase">{lugar.nombre_lugar}</h4>
                            </div>
                          </div>
                          <Badge className="bg-slate-950/80 text-teal-400 border border-teal-500/20 font-mono text-xs px-3 py-1 rounded-full">
                            Registro ICA: {lugar.numero_registro || "Pendiente Asignación"}
                          </Badge>
                        </div>

                        {/* Detalles de la Empresa */}
                        <CardContent className="p-6 space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Propietario / Empresa info */}
                            <div className="space-y-4">
                              <div>
                                <h5 className="text-[10px] text-teal-500 font-black uppercase tracking-widest mb-1">Empresa / Productor Responsable</h5>
                                <p className="text-white text-sm font-bold bg-slate-950/30 p-3 rounded-2xl border border-slate-800/50">
                                  {displayName}
                                </p>
                              </div>

                              <div>
                                <h5 className="text-[10px] text-teal-500 font-black uppercase tracking-widest mb-1">Identificación del Propietario</h5>
                                <p className="text-white text-sm font-bold bg-slate-950/30 p-3 rounded-2xl border border-slate-800/50">
                                  {displayDocument}
                                </p>
                              </div>
                            </div>

                            {/* Ubicación y Hectáreas */}
                            <div className="space-y-4">
                              <div>
                                <h5 className="text-[10px] text-teal-500 font-black uppercase tracking-widest mb-1">Cobertura Física Total</h5>
                                <p className="text-white text-sm font-bold bg-slate-950/30 p-3 rounded-2xl border border-slate-800/50">
                                  {totalHectareas} Hectáreas en {linkedPredios.length} Predio(s)
                                </p>
                              </div>

                              <div>
                                <h5 className="text-[10px] text-teal-500 font-black uppercase tracking-widest mb-1">Departamento / Municipio Principal</h5>
                                <p className="text-white text-sm font-bold bg-slate-950/30 p-3 rounded-2xl border border-slate-800/50">
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
                                  <div key={predio.id_predio} className="bg-slate-950/40 border border-slate-800 p-4 rounded-2xl hover:border-slate-700/60 transition-all space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-black uppercase italic tracking-tight text-white">{predio.nombre_predio}</span>
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

"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Leaf,
  MapPin,
  Sprout,
  ClipboardCheck,
  TrendingUp,
  AlertTriangle,
  Plus,
  ArrowRight,
  ExternalLink
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { useUserStore } from "@/lib/store"

interface Predio {
  id_lugar_produccion: number
  nombre_lugar: string
  area_total_m2: number
  numero_predial: string
  lote?: any[]
}

interface Siembra {
  id_siembra: number
  fecha_siembra: string
  cantidad_plantas: number
  id_lote: number
  variedad?: {
    nombre_variedad: string
  }
}

export default function ProductorDashboard() {
  const { user } = useUserStore()
  const [predios, setPredios] = useState<Predio[]>([])
  const [siembras, setSiembras] = useState<Siembra[]>([])
  const [inspecciones, setInspecciones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prediosRes, siembrasRes, inspRes] = await Promise.all([
          api.get("/predios/lugares-produccion"),
          api.get("/cultivos/siembras"),
          api.get("/inspecciones/reporte")
        ])
        setPredios(prediosRes.data)
        setSiembras(siembrasRes.data)
        setInspecciones(inspRes.data)
      } catch (error) {
        console.error("Error cargando datos del dashboard:", error)
      } finally {
        setLoading(false)
      }
    }

    if (user) fetchData()
  }, [user])

  const handleAgendar = (idLugar: number) => {
    window.location.href = `/dashboard/inspecciones/agendar?id_lugar_produccion=${idLugar}`;
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-12"
    >
      {/* Resumen de Metas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Lugares de Producción"
          value={predios.length.toString()}
          icon={<MapPin className="w-6 h-6 text-emerald-500" />}
          trend="+1 este mes"
          color="emerald"
        />
        <StatCard
          title="Lotes y Siembras"
          value={siembras.length.toString()}
          icon={<Sprout className="w-6 h-6 text-teal-500" />}
          trend="En producción"
          color="teal"
        />
        <StatCard
          title="Inspecciones"
          value={inspecciones.length.toString()}
          icon={<ClipboardCheck className="w-6 h-6 text-blue-500" />}
          trend="Pendientes"
          color="blue"
        />
        <StatCard
          title="Alertas"
          value="0"
          icon={<AlertTriangle className="w-6 h-6 text-rose-500" />}
          trend="Sin riesgos"
          color="rose"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Lista de Predios */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Leaf className="w-6 h-6 text-emerald-500" />
              Lugares de Producción
            </h2>
            <Button variant="outline" className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10">
              <Plus className="w-4 h-4 mr-2" /> Nuevo Lugar
            </Button>
          </div>

          <div className="grid gap-4">
            {predios.length > 0 ? predios.map((predio) => (
              <motion.div key={predio.id_lugar_produccion} variants={item}>
                <Card className="bg-slate-900/50 border-slate-800 hover:border-emerald-500/30 transition-all group overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="text-xl font-semibold text-white group-hover:text-emerald-400 transition-colors">
                          {predio.nombre_lugar}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <IdCard className="w-3.5 h-3.5" /> Predio: {predio.numero_predial}
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" /> {predio.area_total_m2} m²
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                          onClick={() => handleAgendar(predio.id_lugar_produccion)}
                        >
                          <ClipboardCheck className="w-3.5 h-3.5 mr-1" /> Agendar Inspección
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-slate-500 hover:text-emerald-400"
                          onClick={() => handleAgendar(predio.id_lugar_produccion)}
                        >
                          <ArrowRight className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )) : (
              <div className="text-center py-12 bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                <p className="text-slate-500">No tienes lugares de producción registrados aún.</p>
              </div>
            )}
          </div>
        </div>

        {/* Panel Lateral: Estado de Lotes y Siembras REAL */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sprout className="w-5 h-5 text-teal-400" />
            Lotes y Producción
          </h2>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {predios.map((predio) => (
              predio.lote?.map((l) => {
                const siembraActiva = siembras.find(s => s.id_lote === l.id_lote);
                
                return (
                  <Card key={l.id_lote} className={`bg-slate-900/30 border-slate-800/50 transition-all ${!siembraActiva && l.estado === 'disponible' ? 'border-emerald-500/20' : ''}`}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        siembraActiva ? 'bg-teal-500/10' : 
                        l.estado === 'disponible' ? 'bg-emerald-500/10' : 'bg-slate-800'
                      }`}>
                        <Sprout className={`w-5 h-5 ${
                          siembraActiva ? 'text-teal-500' : 
                          l.estado === 'disponible' ? 'text-emerald-500' : 'text-slate-500'
                        }`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white truncate">
                            {l.nombre_lote}
                          </p>
                          {!siembraActiva && (
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                              l.estado === 'disponible' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                            }`}>
                              {l.estado === 'disponible' ? 'Disponible' : 'Inactivo'}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 italic">
                          {predio.nombre_lugar}
                        </p>
                        {siembraActiva ? (
                          <p className="text-xs font-medium text-teal-500 mt-1">
                            🌱 {siembraActiva.variedad?.nombre_variedad || 'En cultivo'}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-600 mt-1">
                            {l.estado === 'disponible' ? 'Listo para nueva siembra' : 'Finalizado - Inactivo'}
                          </p>
                        )}
                      </div>

                      {siembraActiva && (
                        <div className="text-right">
                          <p className="text-xs font-bold text-teal-500">{siembraActiva.cantidad_plantas}</p>
                          <p className="text-[10px] text-slate-600 uppercase">Plantas</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            ))}
            
            {predios.every(p => !p.lote || p.lote.length === 0) && (
              <div className="text-center py-10 opacity-50">
                <p className="text-xs text-slate-500 italic">No hay lotes configurados</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function StatCard({ title, value, icon, trend, color }: any) {
  const colorMap: any = {
    emerald: "from-emerald-500/20 to-transparent border-emerald-500/20",
    teal: "from-teal-500/20 to-transparent border-teal-500/20",
    blue: "from-blue-500/20 to-transparent border-blue-500/20",
    rose: "from-rose-500/20 to-transparent border-rose-500/20",
  }

  return (
    <motion.div variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}>
      <Card className={`bg-slate-900/40 border-0 shadow-xl overflow-hidden relative group`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${colorMap[color]} opacity-50`} />
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-slate-950/50 rounded-lg border border-white/5">
              {icon}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{trend}</span>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-tighter">{title}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
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

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
  ExternalLink,
  Maximize2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { useUserStore } from "@/lib/store"

interface Predio {
  id_lugar_produccion: number
  nombre_lugar: string
  area_total: number
  numero_predial: string
  nombre_predio: string
  created_at: string
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

  const fetchPredios = async () => {
    try {
      setLoading(true)
      // Añadimos un timestamp para evitar cache del navegador
      const res = await api.get(`/predios/lugares-produccion?t=${Date.now()}`)
      setPredios(res.data)
    } catch (error) {
      console.error("Error fetching predios:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([
          fetchPredios(),
          api.get("/cultivos/siembras").then(res => setSiembras(res.data)),
          api.get("/inspecciones/reporte").then(res => setInspecciones(res.data))
        ])
      } catch (error) {
        console.error("Error cargando datos del dashboard:", error)
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

  const handleUpdateLugar = (id: number, newName: string) => {
    setPredios(prev => prev.map(p =>
      p.id_lugar_produccion === id ? { ...p, nombre_lugar: newName } : p
    ))
  }

  const handleDeleteLugar = (id: number) => {
    if (confirm("¿Estás seguro de eliminar este lugar de producción?")) {
      api.delete(`/predios/lugares-produccion/${id}`)
        .then(() => {
          setPredios(prev => prev.filter(p => p.id_lugar_produccion !== id))
        })
        .catch(err => console.error("Error eliminando:", err))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  // 📊 Cálculos Dinámicos de Tendencias
  const ahora = new Date();
  const prediosEsteMes = predios.filter((p: any) => {
    const fecha = new Date(p.created_at || ahora); // Fallback al hoy si no hay fecha
    return fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear();
  }).length;

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
          trend={`+${prediosEsteMes} este mes`}
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
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Leaf className="w-6 h-6 text-emerald-500" />
              Lugares de Producción
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            {predios.length > 0 ? predios.slice(0, 5).map((predio) => (
              <Card key={predio.id_lugar_produccion} className="bg-card border-border hover:border-emerald-500/50 transition-all group overflow-hidden shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Sprout className="text-emerald-500 w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold truncate">{predio.nombre_lugar}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="w-3 h-3 text-emerald-500" />
                          <span className="truncate">{user?.nombre_predio || "Principal"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground px-4 border-x border-border">
                      <Maximize2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{predio.area_total} m²</span>
                    </div>

                    <Button 
                      size="sm"
                      className="bg-muted hover:bg-emerald-600 text-emerald-600 dark:text-emerald-400 hover:text-white border border-border transition-all font-bold h-9 px-4 shrink-0 rounded-xl"
                      onClick={() => handleAgendar(predio.id_lugar_produccion)}
                    >
                      <ClipboardCheck className="w-4 h-4 mr-2" />
                      Agendar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="text-center py-12 bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                <p className="text-slate-500">No tienes lugares de producción registrados aún.</p>
              </div>
            )}
          </div>
        </div>

        {/* Panel Lateral: Estado de Lotes y Siembras REAL */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sprout className="w-5 h-5 text-teal-400" />
            Lotes y Producción
          </h2>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {predios.map((predio) => (
              predio.lote?.map((l) => {
                const siembraActiva = siembras.find(s => s.id_lote === l.id_lote);

                return (
                  <Card key={l.id_lote} className={`bg-card border-border transition-all shadow-sm ${!siembraActiva && l.estado === 'disponible' ? 'ring-1 ring-emerald-500/20' : ''}`}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${siembraActiva ? 'bg-teal-500/10' :
                        l.estado === 'disponible' ? 'bg-emerald-500/10' : 'bg-muted'
                        }`}>
                        <Sprout className={`w-5 h-5 ${siembraActiva ? 'text-teal-500' :
                          l.estado === 'disponible' ? 'text-emerald-500' : 'text-slate-500'
                          }`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold truncate">
                            {l.nombre_lote}
                          </p>
                          {!siembraActiva && (
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${l.estado === 'disponible' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
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
                          <p className="text-xs text-muted-foreground mt-1">
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
      <Card className={`bg-card border-border shadow-md overflow-hidden relative group transition-all hover:shadow-lg`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${colorMap[color]} opacity-50`} />
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-muted rounded-lg border border-border">
              {icon}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{trend}</span>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold tracking-tight">{value}</p>
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

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
  Maximize2,
  Navigation,
  X
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { useUserStore } from "@/lib/store"

interface Predio {
  id_predio: number
  nombre_predio: string
  area_hectareas: number
  numero_predial: string
  lugar_produccion?: {
    nombre_lugar: string
  }
  lote?: any[]
}

interface Siembra {
  id_siembra: number
  fecha_siembra: string
  fecha_fin?: string | null
  cantidad_plantas: number
  id_lote: number
  variedad?: {
    nombre_variedad: string
  }
}

export default function ProductorDashboard() {
  const { user, selectedPredioId: selectedPredioIdStr, setSelectedPredioId: setSelectedPredioIdStr } = useUserStore()
  const [predios, setPredios] = useState<Predio[]>([])
  const [siembras, setSiembras] = useState<Siembra[]>([])
  const [inspecciones, setInspecciones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const selectedPredioId = selectedPredioIdStr ? Number(selectedPredioIdStr) : null
  const setSelectedPredioId = (id: number | null) => setSelectedPredioIdStr(id ? id.toString() : null)

  const fetchPredios = async () => {
    try {
      setLoading(true)
      // Usamos el endpoint que lista la tabla 'predio'
      const res = await api.get(`/predios/list?t=${Date.now()}`)
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

  const handleAgendar = (idPredio: number) => {
    window.location.href = `/dashboard/inspecciones/agendar?id_predio=${idPredio}`;
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
      p.id_predio === id ? { ...p, nombre_predio: newName } : p
    ))
  }

  const handleDeleteLugar = (id: number) => {
    if (confirm("¿Estás seguro de eliminar este predio?")) {
      api.delete(`/predios/predios/${id}`)
        .then(() => {
          setPredios(prev => prev.filter(p => p.id_predio !== id))
          if (selectedPredioId === id) setSelectedPredioId(null)
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

  // 📊 Cálculos Dinámicos y Filtros basados en la selección de predio
  const ahora = new Date();
  const prediosEsteMes = predios.filter((p: any) => {
    const fecha = new Date(p.created_at || ahora);
    return fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear();
  }).length;

  const selectedPredio = selectedPredioId ? predios.find(p => p.id_predio === selectedPredioId) : null;

  // Lotes filtrados (ocultando los que el backend marcó como 'inactivo' = eliminados lógicamente)
  const lotesFiltrados = (selectedPredioId
    ? (selectedPredio?.lote || [])
    : predios.flatMap(p => p.lote || [])).filter(l => l.estado !== 'inactivo');

  // Siembras filtradas
  const siembrasActivasFiltradas = siembras.filter(s => {
    const isActiva = !s.fecha_fin;
    if (!selectedPredioId) return isActiva;
    return isActiva && lotesFiltrados.some(l => l.id_lote === s.id_lote);
  });

  // Inspecciones filtradas (ignorando canceladas o eliminadas)
  const inspeccionesFiltradas = inspecciones.filter(ins => {
    const isValida = ins.estado !== 'cancelada' && ins.estado !== 'eliminado' && ins.estado !== 'eliminada';
    if (!isValida) return false;

    if (!selectedPredioId) return true;
    return Number(ins.id_predio) === selectedPredioId;
  });

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-12"
    >
      {/* Resumen de Metas */}
      <div className={`grid gap-6 ${selectedPredioId ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
        {!selectedPredioId && (
          <StatCard
            title="Predios Registrados"
            value={predios.length.toString()}
            icon={<MapPin className="w-6 h-6 text-emerald-500" />}
            trend={`+${prediosEsteMes} este mes`}
            color="emerald"
          />
        )}
        <StatCard
          title={selectedPredioId ? "Siembras en Predio" : "Lotes y Siembras"}
          value={siembrasActivasFiltradas.length.toString()}
          icon={<Sprout className="w-6 h-6 text-teal-500" />}
          trend={selectedPredioId ? `En ${selectedPredio?.nombre_predio}` : "En producción"}
          color="teal"
        />
        <StatCard
          title={selectedPredioId ? "Inspecciones Predio" : "Inspecciones"}
          value={inspeccionesFiltradas.length.toString()}
          icon={<ClipboardCheck className="w-6 h-6 text-blue-500" />}
          trend={selectedPredioId ? "Para este predio" : "Pendientes"}
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
              Predios Registrados
              {selectedPredioId && (
                <span 
                  onClick={() => setSelectedPredioId(null)}
                  className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-normal cursor-pointer hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors flex items-center gap-1"
                  title="Clic para quitar filtro"
                >
                  Filtro activo: {selectedPredio?.nombre_predio}
                  <X className="w-3 h-3 ml-1" />
                </span>
              )}
            </h2>
            {!selectedPredioId && (
              <p className="text-xs text-muted-foreground italic hidden sm:block">
                Selecciona una tarjeta para filtrar los lotes e inspecciones.
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            {predios.length > 0 ? predios.map((predio) => {
              const isSelected = selectedPredioId === predio.id_predio;
              return (
                <Card 
                  key={predio.id_predio} 
                  onClick={() => setSelectedPredioId(isSelected ? null : predio.id_predio)}
                  className={`bg-card transition-all duration-350 cursor-pointer overflow-hidden shadow-sm border-2 ${
                    isSelected 
                      ? 'border-emerald-500 shadow-md shadow-emerald-500/5 bg-emerald-500/[0.015]' 
                      : 'border-border hover:border-emerald-500/30'
                  } group`}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform ${
                          isSelected ? 'bg-emerald-500/10 scale-110' : 'bg-muted group-hover:scale-110'
                        }`}>
                          <MapPin className={`${isSelected ? 'text-emerald-400' : 'text-emerald-500'} w-5 h-5`} />
                        </div>
                        <div className="min-w-0">
                          <h3 className={`text-base font-bold truncate transition-colors ${isSelected ? 'text-emerald-400' : ''}`}>
                            {predio.nombre_predio}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <Navigation className="w-3 h-3 text-emerald-500" />
                            <span className="truncate">{predio.lugar_produccion?.nombre_lugar || "Lugar no definido"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground px-4 border-x border-border">
                        <Maximize2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{predio.area_hectareas} Ha</span>
                      </div>

                      <Button
                        size="sm"
                        className={`transition-all font-bold h-9 px-4 shrink-0 rounded-xl border ${
                          isSelected 
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-600/20' 
                            : 'bg-muted hover:bg-emerald-600 text-emerald-600 dark:text-emerald-400 hover:text-white border-border'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAgendar(predio.id_predio);
                        }}
                      >
                        <ClipboardCheck className="w-4 h-4 mr-2" />
                        Agendar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            }) : (
              <div className="text-center py-12 bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                <p className="text-slate-500">No tienes predios registrados aún.</p>
              </div>
            )}
          </div>
        </div>

        {/* Panel Lateral: Estado de Lotes y Siembras REAL */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sprout className="w-5 h-5 text-teal-400" />
              {selectedPredioId ? "Lotes del Predio" : "Lotes y Producción"}
            </h2>
            {selectedPredioId && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-teal-400 hover:text-teal-300 font-bold hover:bg-teal-950/30 px-2.5 py-1 h-7 rounded-lg transition-all"
                onClick={() => setSelectedPredioId(null)}
              >
                Ver todos
              </Button>
            )}
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {lotesFiltrados.length > 0 ? lotesFiltrados.map((l) => {
              const siembraActiva = siembras.find(s => s.id_lote === l.id_lote && !s.fecha_fin);
              const predio = predios.find(p => p.lote?.some(lot => lot.id_lote === l.id_lote));

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
                        {predio?.nombre_predio || 'Sin predio asignado'}
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

                    <div className="text-right">
                      <p className="text-xs font-bold text-teal-500">{siembraActiva?.cantidad_plantas || 0}</p>
                      <p className="text-[10px] text-slate-600 uppercase">Plantas</p>
                    </div>
                  </CardContent>
                </Card>
              );
            }) : (
              <div className="text-center py-12 bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                <p className="text-xs text-slate-500 italic">
                  {selectedPredioId ? "Este predio aún no tiene lotes registrados" : "No tienes lotes configurados aún."}
                </p>
              </div>
            )}

            {/* Mostrar mensaje si no hay ninguna producción activa en este predio seleccionado */}
            {selectedPredioId && lotesFiltrados.length > 0 && !lotesFiltrados.some(l => siembras.some(s => s.id_lote === l.id_lote && !s.fecha_fin)) && (
              <div className="text-center py-6 opacity-60 bg-slate-950/10 rounded-2xl border border-slate-800/40">
                <p className="text-xs text-slate-500 italic">No hay siembras activas en este predio</p>
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

"use client"

import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
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
  X,
  ShieldAlert,
  Lock
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
  id_lugar_produccion?: number
  lugar_produccion?: {
    id_lugar_produccion?: number
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

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/api/dashboard/resumen?t=${Date.now()}`)
      setPredios(res.data.predios || [])
      setSiembras(res.data.siembras || [])
      setInspecciones(res.data.inspecciones || [])
    } catch (error) {
      console.error("Error fetching dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) fetchDashboard()
  }, [user])

  const handleAgendar = () => {
    window.location.href = `/dashboard/agendar`;
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

  // 🚨 Calcular Alertas Fitosanitarias (incidencia o infestación > 30%)
  const alertasFitosanitarias = useMemo(() => {
    const listaAlertas: {
      id_inspeccion: number
      id_lote: number
      lote_nombre: string
      predio_nombre: string
      plaga_nombre?: string
      porcentaje: number
      fecha: string
    }[] = []

    inspecciones.forEach((ins: any) => {
      if (selectedPredioId) {
        const predioObj = predios.find(p => p.id_predio === selectedPredioId)
        if (Number(ins.id_predio) !== selectedPredioId && Number(ins.id_lugar_produccion) !== predioObj?.id_lugar_produccion) {
          return
        }
      }

      if (ins.estado === "finalizada" && Array.isArray(ins.detalle_inspeccion)) {
        ins.detalle_inspeccion.forEach((det: any) => {
          const porcentaje = Number(det.porcentaje_infestacion) || 0
          if (porcentaje > 30) {
            const siembra = siembras.find(s => s.id_siembra === det.siembra_id)
            if (siembra) {
              const loteId = siembra.id_lote
              const predio = predios.find(p => p.lote?.some(l => l.id_lote === loteId))
              const lote = predio?.lote?.find(l => l.id_lote === loteId)
              listaAlertas.push({
                id_inspeccion: ins.id_inspeccion,
                id_lote: loteId,
                lote_nombre: lote?.nombre_lote || `Lote #${loteId}`,
                predio_nombre: predio?.nombre_predio || "Sin predio",
                plaga_nombre: det.plaga || "Incidencia alta",
                porcentaje,
                fecha: ins.fecha_programada
              })
            }
          }
        })
      }
    })

    return listaAlertas
  }, [inspecciones, siembras, predios, selectedPredioId])

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

  // Especies únicas en cultivo activo (para la card cuando hay predio seleccionado)
  const especiesUnicasLista: string[] = Array.from(new Set(
    siembrasActivasFiltradas
      .map(s => (s.variedad as any)?.nombre_variedad || (s as any).especie?.nombre_especie || null)
      .filter((v): v is string => Boolean(v))
  ));
  const MAX_ESPECIES_VISIBLES = 3;

  // Inspecciones filtradas (ignorando canceladas o eliminadas)
  const inspeccionesFiltradas = inspecciones.filter(ins => {
    const isValida = ins.estado !== 'cancelada' && ins.estado !== 'eliminado' && ins.estado !== 'eliminada';
    if (!isValida) return false;

    if (!selectedPredioId) return true;
    return Number(ins.id_predio) === selectedPredioId || Number(ins.id_lugar_produccion) === selectedPredio?.id_lugar_produccion;
  });

  const getIdLugarProduccion = (predio: Predio): number | undefined => {
    return predio.id_lugar_produccion || predio.lugar_produccion?.id_lugar_produccion;
  };

  const checkLugarTieneInspeccionActiva = (idLugarProduccion: number | undefined) => {
    if (!idLugarProduccion) return false;
    return inspecciones.some(ins =>
      Number(ins.id_lugar_produccion) === Number(idLugarProduccion) &&
      (ins.estado === 'programada' || ins.estado === 'en_proceso')
    );
  };

  // Calcular si HAY alguna inspección activa en cualquier lugar del productor
  const inspeccionActivaGlobal = inspecciones.find(ins =>
    ins.estado === 'programada' || ins.estado === 'en_proceso'
  );

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-12"
    >
      {/* 🚨 Banner global de inspección activa */}
      <AnimatePresence>
        {inspeccionActivaGlobal && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            className="relative overflow-hidden rounded-3xl border-2 border-rose-500/40 bg-gradient-to-r from-rose-500/10 via-background to-rose-500/5 backdrop-blur-sm p-4 md:p-6 shadow-xl shadow-rose-900/10"
          >
            {/* Fondo decorativo */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(225,29,72,0.1),transparent_60%)]" />
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-5 text-left">
              <div className="shrink-0 w-12 h-12 md:w-14 md:h-14 bg-rose-500/20 border border-rose-500/30 rounded-2xl flex items-center justify-center">
                <ShieldAlert className="text-rose-500 w-6 h-6 md:w-7 md:h-7 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-rose-600 dark:text-rose-300 font-black text-sm md:text-base uppercase tracking-widest italic leading-none mb-1">
                  Inspección Fitosanitaria Activa
                </p>
                <p className="text-rose-600/80 dark:text-rose-400/80 text-xs md:text-sm font-medium leading-snug">
                  Su Lugar de Producción está bajo una <span className="font-black text-rose-600 dark:text-rose-300">inspección técnica ICA</span>.
                  No se pueden modificar activos mientras esté activa.
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 md:px-4 md:py-2 rounded-2xl">
                <Lock className="w-3.5 h-3.5 text-rose-500" />
                <span className="text-rose-600 dark:text-rose-300 font-black text-[10px] md:text-xs uppercase tracking-widest">
                  {inspeccionActivaGlobal.estado === 'en_proceso' ? 'EN CURSO' : 'PROGRAMADA'}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className={`grid gap-6 ${selectedPredioId ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'} items-stretch`}>
        {/* 1. Alertas (Configuradas con lógica de umbral > 30%) */}
        <motion.div className="h-full flex" variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}>
          <Card className={`bg-card border-2 shadow-md overflow-hidden relative group transition-all h-full w-full text-left flex flex-col justify-between ${alertasFitosanitarias.length > 0 ? 'border-rose-500/50 shadow-rose-900/10' : 'border-border'}`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${alertasFitosanitarias.length > 0 ? 'from-rose-500/10 to-transparent' : 'from-muted/50 to-transparent'} opacity-50`} />
            <CardContent className="p-4 relative z-10 flex flex-col justify-between h-full w-full">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-1.5 rounded-lg border ${alertasFitosanitarias.length > 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-muted border-border'}`}>
                    <AlertTriangle className={`w-5 h-5 ${alertasFitosanitarias.length > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-500'}`} />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${alertasFitosanitarias.length > 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                    {alertasFitosanitarias.length > 0 ? '¡URGENTE!' : 'SIN RIESGOS'}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <p className="text-2xl font-bold tracking-tight">{alertasFitosanitarias.length}</p>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tighter">Alertas Fitosanitarias</p>
                </div>
              </div>

              {alertasFitosanitarias.length > 0 && (
                <div className="mt-3 pt-3 border-t border-rose-500/10 max-h-[100px] overflow-y-auto custom-scrollbar pr-2 space-y-1.5">
                  {alertasFitosanitarias.map((alerta, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 bg-rose-500/5 p-1.5 rounded-lg border border-rose-500/10">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-rose-500 truncate">{alerta.lote_nombre}</p>
                        <p className="text-[9px] text-muted-foreground font-bold">{alerta.porcentaje}% infestación</p>
                      </div>
                      <Link
                        href={`/dashboard/historial-registros?inspeccion=${alerta.id_inspeccion}&lote=${alerta.id_lote}`}
                        className="shrink-0 p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-600 rounded-md transition-colors"
                        title="Ver inspección"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* 2. Lotes (Siempre visible) */}
        <motion.div className="h-full flex" variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}>
          <Card className="bg-card border-border shadow-md overflow-hidden relative group transition-all hover:shadow-lg h-full w-full text-left flex flex-col justify-between">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 to-transparent border-teal-500/20 opacity-50" />
            <CardContent className="p-4 relative z-10 flex flex-col justify-between h-full w-full">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 bg-muted rounded-lg border border-border">
                    <Sprout className="w-5 h-5 text-teal-500" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-tighter leading-none">Lotes</p>
                  {lotesFiltrados.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {lotesFiltrados.slice(0, 3).map((l, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-500/10 text-teal-400 border border-teal-500/20 max-w-[100px] truncate" title={l.nombre_lote}>
                          {l.nombre_lote}
                        </span>
                      ))}
                      {lotesFiltrados.length > 3 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-muted text-muted-foreground border border-border">
                          +{lotesFiltrados.length - 3}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic pt-1">Sin lotes</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 3. Inspecciones Realizadas (Sin predio) o Cultivos Activos (Con predio) */}
        {!selectedPredioId ? (
          <motion.div className="h-full flex" variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}>
            <Card className="bg-card border-border shadow-md overflow-hidden relative group transition-all hover:shadow-lg h-full w-full text-left flex flex-col justify-between">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent opacity-50" />
              <CardContent className="p-4 relative z-10 flex flex-col justify-between h-full w-full">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-1.5 bg-muted rounded-lg border border-border">
                      <ClipboardCheck className="w-5 h-5 text-blue-500" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Historial total</span>
                  </div>
                  <div className="space-y-0.5 mb-2">
                    <p className="text-2xl font-bold tracking-tight">{inspeccionesFiltradas.length}</p>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tighter">Inspecciones Realizadas</p>
                  </div>
                  {/* Top técnicos */}
                  {(() => {
                    const conteo: Record<string, number> = {}
                    inspeccionesFiltradas.forEach((ins: any) => {
                      if (ins.tecnico_nombre) {
                        conteo[ins.tecnico_nombre] = (conteo[ins.tecnico_nombre] || 0) + 1
                      }
                    })
                    const topTecnicos = Object.entries(conteo)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3)
                    if (topTecnicos.length === 0) return null
                    return (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {topTecnicos.map(([nombre, count]) => (
                          <span key={nombre} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 max-w-[120px] truncate" title={nombre}>
                            {nombre.split(' ')[0]}
                            <span className="text-blue-300 font-black">{count}</span>
                          </span>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* Card personalizada: Cultivos en el predio */
          <motion.div className="h-full flex" variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}>
            <Card className="bg-card border-border shadow-md overflow-hidden relative group transition-all hover:shadow-lg h-full w-full text-left flex flex-col justify-between">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
              <CardContent className="p-4 relative z-10 flex flex-col justify-between h-full w-full">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-1.5 bg-muted rounded-lg border border-border">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate max-w-[120px]">
                      En {selectedPredio?.nombre_predio}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-tighter mb-2">Cultivos Activos</p>
                    {especiesUnicasLista.length === 0 ? (
                      <p className="text-muted-foreground text-xs italic">Sin cultivos activos</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {especiesUnicasLista.slice(0, MAX_ESPECIES_VISIBLES).map((especie, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20 max-w-[140px] truncate"
                            title={especie}
                          >
                            {especie.length > 16 ? especie.slice(0, 15) + '…' : especie}
                          </span>
                        ))}
                        {especiesUnicasLista.length > MAX_ESPECIES_VISIBLES && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-muted text-muted-foreground border border-border">
                            +{especiesUnicasLista.length - MAX_ESPECIES_VISIBLES} más
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 4. pp Pred (Solo si no hay predio seleccionado) */}
        {!selectedPredioId && (
          <motion.div className="h-full flex" variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}>
            <Card className="bg-card border-border shadow-md overflow-hidden relative group transition-all hover:shadow-lg h-full w-full text-left flex flex-col justify-between">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent border-emerald-500/20 opacity-50" />
              <CardContent className="p-4 relative z-10 flex flex-col justify-between h-full w-full">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-1.5 bg-muted rounded-lg border border-border">
                      <MapPin className="w-5 h-5 text-emerald-500" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {`+${prediosEsteMes} este mes`}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-tighter leading-none">Predio</p>
                    {predios.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {predios.slice(0, 3).map((p, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 max-w-[100px] truncate" title={p.nombre_predio}>
                            {p.nombre_predio}
                          </span>
                        ))}
                        {predios.length > 3 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-muted text-muted-foreground border border-border">
                            +{predios.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic pt-1">Sin predios</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Lista de Predios */}
        <div className={`${selectedPredioId ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
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
          </div>

          {!selectedPredioId && (
            <p className="text-sm text-muted-foreground italic">
              Selecciona una tarjeta para filtrar los lotes e inspecciones.
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            {predios.length > 0 ? predios.map((predio) => {
              const isSelected = selectedPredioId === predio.id_predio;
              const idLugar = getIdLugarProduccion(predio);
              const isLocked = checkLugarTieneInspeccionActiva(idLugar);
              return (
                <Card
                  key={predio.id_predio}
                  onClick={() => setSelectedPredioId(isSelected ? null : predio.id_predio)}
                  className={`bg-card transition-all duration-350 cursor-pointer overflow-hidden shadow-sm border-2 ${isSelected
                    ? 'border-emerald-500 shadow-md shadow-emerald-500/5 bg-emerald-500/[0.015]'
                    : isLocked
                      ? 'border-rose-500/30 bg-rose-950/10'
                      : 'border-border hover:border-emerald-500/30'
                    } group`}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform ${isSelected ? 'bg-emerald-500/10 scale-110' : 'bg-muted group-hover:scale-110'
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
                            {isLocked && (
                              <span className="text-[9px] font-black uppercase text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" /> CONGELADO
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground px-4 border-x border-border">
                        <Maximize2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{predio.area_hectareas} Ha</span>
                      </div>

                      <Button
                        size="sm"
                        disabled={isLocked}
                        className={`transition-all font-bold h-9 px-4 shrink-0 rounded-xl border ${isSelected
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-600/20'
                          : 'bg-muted hover:bg-emerald-600 text-emerald-600 dark:text-emerald-400 hover:text-white border-border'
                          } disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-400 disabled:border-slate-700`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAgendar();
                        }}
                      >
                        <ClipboardCheck className="w-4 h-4 mr-2" />
                        {isLocked ? 'Inspección Activa' : 'Agendar'}
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
        {selectedPredioId && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black flex items-center gap-2 tracking-tight">
                <Sprout className="w-6 h-6 text-teal-400" />
                {selectedPredioId ? "Lotes del Predio" : "Lotes y Producción"}
              </h2>
            </div>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar text-left">
              {lotesFiltrados.length > 0 ? lotesFiltrados.map((l) => {
                const siembraActiva = siembras.find(s => s.id_lote === l.id_lote && !s.fecha_fin);
                const predio = predios.find(p => p.lote?.some(lot => lot.id_lote === l.id_lote));

                return (
                  <Card key={l.id_lote} className={`bg-card border-border transition-all shadow-md hover:shadow-lg ${!siembraActiva && l.estado === 'disponible' ? 'ring-2 ring-primary/20' : ''}`}>
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${siembraActiva ? 'bg-primary/10' :
                        l.estado === 'disponible' ? 'bg-emerald-500/10' : 'bg-muted'
                        }`}>
                        <Sprout className={`w-6 h-6 ${siembraActiva ? 'text-primary' :
                          l.estado === 'disponible' ? 'text-emerald-500' : 'text-muted-foreground'
                          }`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-base font-black truncate text-foreground leading-tight">
                            {l.nombre_lote}
                          </p>
                          {!siembraActiva && (
                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full leading-none ${l.estado === 'disponible' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-destructive/20 text-destructive'
                              }`}>
                              {l.estado === 'disponible' ? 'Disponible' : 'Inactivo'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-semibold italic mt-0.5">
                          predio: <span>{predio?.nombre_predio || 'Sin predio asignado'}</span>
                        </p>
                        {siembraActiva ? (
                          <p className="text-sm font-bold text-primary mt-1.5">
                            cultivo: <span>{siembraActiva.variedad?.nombre_variedad || 'En cultivo'}</span>
                          </p>
                        ) : (
                          <p className="text-xs font-semibold text-muted-foreground mt-1.5">
                            {l.estado === 'disponible' ? 'Listo para nueva siembra' : 'Finalizado - Inactivo'}
                          </p>
                        )}
                      </div>

                      <div className="text-right flex-shrink-0 pl-2">
                        <p className="text-base font-black text-primary leading-tight">{siembraActiva?.cantidad_plantas || 0}</p>
                        <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">Plantas</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              }) : (
                <div className="text-center py-12 bg-muted/20 rounded-3xl border border-dashed border-border">
                  <p className="text-sm text-muted-foreground italic font-semibold">
                    {selectedPredioId ? "Este predio aún no tiene lotes registrados" : "No tienes lotes configurados aún."}
                  </p>
                </div>
              )}

              {/* Mostrar mensaje si no hay ninguna producción activa en este predio seleccionado */}
              {selectedPredioId && lotesFiltrados.length > 0 && !lotesFiltrados.some(l => siembras.some(s => s.id_lote === l.id_lote && !s.fecha_fin)) && (
                <div className="text-center py-6 opacity-60 bg-muted/10 rounded-2xl border border-border">
                  <p className="text-sm text-muted-foreground italic font-semibold">No hay siembras activas en este predio</p>
                </div>
              )}
            </div>
          </div>
        )}
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
    <motion.div className="h-full flex" variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}>
      <Card className="bg-card border-border shadow-md overflow-hidden relative group transition-all hover:shadow-lg h-full w-full flex flex-col justify-between">
        <div className={`absolute inset-0 bg-gradient-to-br ${colorMap[color]} opacity-50`} />
        <CardContent className="p-4 relative z-10 flex flex-col justify-between h-full w-full">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 bg-muted rounded-lg border border-border">
                {icon}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{trend}</span>
            </div>
            <div className="space-y-0.5">
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tighter">{title}</p>
            </div>
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

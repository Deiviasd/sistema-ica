"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { useUserStore } from "@/lib/store"
import api from "@/lib/api"
import {
  Search,
  Calendar,
  User,
  Sprout,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
  X,
  ClipboardList,
  AlertCircle
} from "lucide-react"

import { InformeCompletoModal } from "@/components/dashboard/components/InformeCompletoModal"
import { Inspection, LugarProduccion } from "@/components/dashboard/types/inspection"
import { RawPredia, RawLote, RawSiembra, RawPlaga, DetalleEnriquecido, EnrichedInspection } from "@/app/dashboard/historial-registros/historialtipos"

// ── Componente ─────────────────────────────────────────────────
export default function HistorialRegistrosPage() {
  const { user } = useUserStore()
  const router = useRouter()

  const formatLocalDateString = (dateStr: string, monthStyle: "long" | "short") => {
    if (!dateStr) return ""
    try {
      const dateOnly = dateStr.split("T")[0]
      const parts = dateOnly.split("-")
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10) - 1
        const day = parseInt(parts[2], 10)
        return new Date(year, month, day).toLocaleDateString("es-ES", {
          year: "numeric",
          month: monthStyle,
          day: "numeric"
        })
      }
      return new Date(dateStr).toLocaleDateString("es-ES", {
        year: "numeric",
        month: monthStyle,
        day: "numeric"
      })
    } catch (e) {
      console.error(e)
      return dateStr
    }
  }

  const [inspecciones, setInspecciones] = useState<Inspection[]>([])
  const [predios, setPredios] = useState<RawPredia[]>([])
  const [siembras, setSiembras] = useState<RawSiembra[]>([])
  const [plagas, setPlagas] = useState<RawPlaga[]>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPredio, setSelectedPredio] = useState("all")
  const [selectedLote, setSelectedLote] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [showFiltersPanel, setShowFiltersPanel] = useState(false)

  useEffect(() => {
    if (user && user.role !== "productor" && user.role !== "admin") {
      router.push("/dashboard")
    }
  }, [user, router])

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      setError(null)

      const [resResumen, resPlagas] = await Promise.all([
        api.get("/api/dashboard/resumen"),
        api.get("/cultivos/plagas")
      ])

      setPredios(resResumen.data?.predios || [])
      setSiembras(resResumen.data?.siembras || [])
      setInspecciones(resResumen.data?.inspecciones || [])
      setPlagas(resPlagas.data || [])

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      console.error("Error al cargar historial de registros:", message)
      setError("No se pudo cargar la información del historial. Por favor, intente de nuevo.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (user) fetchData()
  }, [user])

  const activeLugarNombre = useMemo(() => {
    if (selectedPredio !== "all") {
      const pred = predios.find(p => String(p.id_predio) === selectedPredio)
      if (pred?.lugar_produccion?.nombre_lugar) return pred.lugar_produccion.nombre_lugar
    }
    if (predios.length > 0 && predios[0]?.lugar_produccion?.nombre_lugar) {
      return predios[0].lugar_produccion.nombre_lugar
    }
    return "Lugar no registrado"
  }, [selectedPredio, predios])

  const filterOptions = useMemo(() => {
    const prediosList = predios.map(p => ({
      id: String(p.id_predio),
      nombre: p.nombre_predio
    }))

    let targetLotes: RawLote[] = []
    if (selectedPredio !== "all") {
      const pred = predios.find(p => String(p.id_predio) === selectedPredio)
      targetLotes = pred?.lote || []
    } else {
      targetLotes = predios.flatMap(p => p.lote || [])
    }

    const lotesList = targetLotes.map(lo => ({
      id: String(lo.id_lote),
      nombre: lo.nombre_lote
    }))

    return { predios: prediosList, lotes: lotesList }
  }, [predios, selectedPredio])

  const enrichedInspecciones = useMemo<EnrichedInspection[]>(() => {
    const predioMap = new Map<string, RawPredia>()
    const loteMap = new Map<string, RawLote & { id_predio?: number | string }>()
    const lugarMap = new Map<string, LugarProduccion>()

    predios.forEach(p => {
      predioMap.set(String(p.id_predio), p)

      const lp = p.lugar_produccion
      if (lp && p.id_lugar_produccion != null) {
        lugarMap.set(String(p.id_lugar_produccion), lp)
      }

      p.lote?.forEach(lo => {
        loteMap.set(String(lo.id_lote), { ...lo, id_predio: p.id_predio })
      })
    })

    const siembraMap = new Map(siembras.map(s => [Number(s.id_siembra), s]))
    const plagaMap = new Map(plagas.map(p => [Number(p.id_plaga), p]))

    return inspecciones
      .filter(ins => ins.estado === "finalizada")
      .map(ins => {
        const predioObj = predioMap.get(String(ins.id_predio))
        const lugarObj = ins.id_lugar_produccion != null
          ? lugarMap.get(String(ins.id_lugar_produccion))
          : undefined

        const lugar_nombre =
          lugarObj?.nombre_lugar ||
          predioObj?.lugar_produccion?.nombre_lugar ||
          "Lugar sin registrar"
        const predio_nombre = predioObj?.nombre_predio || "Predio sin registrar"

        const detallesRaw =
          (ins as Inspection & { detalle_inspeccion?: DetalleEnriquecido[] })
            .detalle_inspeccion || []

        const detallesEnriquecidos: DetalleEnriquecido[] = detallesRaw.map(det => {
          const siembra = siembraMap.get(Number(det.siembra_id))
          const lote = siembra?.id_lote != null
            ? loteMap.get(String(siembra.id_lote))
            : undefined

          let plagaName: string | null =
            plagaMap.get(Number(det.plaga_id))?.nombre_comun || det.plaga || null

          if (!plagaName && det.observaciones_especificas) {
            plagaName =
              det.observaciones_especificas.match(/\[Plaga:(.+?)\]/)?.[1]?.trim() ?? null
          }

          return {
            ...det,
            siembra,
            lote,
            lote_id: siembra?.id_lote != null ? String(siembra.id_lote) : null,
            predio_id: lote?.id_predio != null
              ? String(lote.id_predio)
              : String(ins.id_predio),
            lote_nombre: lote?.nombre_lote ||
              (siembra?.id_lote ? `Lote #${siembra.id_lote}` : null),
            cultivo: siembra
              ? (siembra.variedad?.especie?.nombre_comun || siembra.especie || "Cultivo")
              : null,
            plaga_nombre: plagaName
          }
        })

        const lotesSet = new Set<string>()
        const cultivosSet = new Set<string>()
        const plagasSet = new Set<string>()

        detallesEnriquecidos.forEach(det => {
          if (det.lote_nombre) lotesSet.add(det.lote_nombre)
          if (det.cultivo) cultivosSet.add(det.cultivo)
          if (det.plaga_nombre) plagasSet.add(det.plaga_nombre)
        })

        return {
          ...ins,
          lugar_produccion:
            lugarObj || predioObj?.lugar_produccion || ({ nombre_lugar: lugar_nombre } as LugarProduccion),
          lugar_nombre,
          predio_nombre,
          detalles_enriquecidos: detallesEnriquecidos,
          lotes_inspeccionados: Array.from(lotesSet),
          cultivos_evaluados: Array.from(cultivosSet),
          plagas_identificadas: Array.from(plagasSet),
          observaciones: ins.observaciones_generales || "Sin observaciones registradas."
        }
      })
  }, [inspecciones, predios, siembras, plagas])

  const filteredInspecciones = useMemo(() => {
    return enrichedInspecciones
      .filter(ins => {
        const matchSearch =
          searchQuery.trim() === "" ||
          ins.tecnico_nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ins.observaciones?.toLowerCase().includes(searchQuery.toLowerCase())

        const matchPredio =
          selectedPredio === "all" ||
          String(ins.id_predio) === selectedPredio ||
          ins.detalles_enriquecidos?.some(det => String(det.predio_id) === selectedPredio)

        const matchLote =
          selectedLote === "all" ||
          ins.detalles_enriquecidos?.some(det => String(det.lote_id) === selectedLote)

        let matchDate = true
        if (ins.fecha_programada) {
          const insDate = new Date(ins.fecha_programada).getTime()
          if (startDate && insDate < new Date(`${startDate}T00:00:00`).getTime()) matchDate = false
          if (endDate && insDate > new Date(`${endDate}T23:59:59`).getTime()) matchDate = false
        }

        return matchSearch && matchPredio && matchLote && matchDate
      })
      .map(ins => {
        if (selectedPredio === "all" && selectedLote === "all") return ins

        const lotesSet = new Set<string>()
        const cultivosSet = new Set<string>()
        const plagasSet = new Set<string>()

        ins.detalles_enriquecidos?.forEach(det => {
          const okPredio = selectedPredio === "all" || String(det.predio_id) === selectedPredio
          const okLote = selectedLote === "all" || String(det.lote_id) === selectedLote
          if (okPredio && okLote) {
            if (det.lote_nombre) lotesSet.add(det.lote_nombre)
            if (det.cultivo) cultivosSet.add(det.cultivo)
            if (det.plaga_nombre) plagasSet.add(det.plaga_nombre)
          }
        })

        return {
          ...ins,
          lotes_inspeccionados: Array.from(lotesSet),
          cultivos_evaluados: Array.from(cultivosSet),
          plagas_identificadas: Array.from(plagasSet)
        }
      })
  }, [enrichedInspecciones, searchQuery, selectedPredio, selectedLote, startDate, endDate])

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedPredio("all")
    setSelectedLote("all")
    setStartDate("")
    setEndDate("")
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-1 md:p-6 space-y-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/30 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-foreground leading-snug">
            Historial Inspecciones Fitosanitarias Para el lugar de producción:{" "}
            <span className="text-emerald-400">{activeLugarNombre}</span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-base mt-1">
            Consulta, filtra y visualiza los informes técnicos detallados de todas las inspecciones realizadas en tus predios.
          </p>
        </div>

        <button
          onClick={() => fetchData(true)}
          disabled={loading || refreshing}
          className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl border border-border transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Sincronizando..." : "Sincronizar"}
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-rose-400">Error de carga</p>
            <p className="text-xs text-rose-350 mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => fetchData()}
            className="text-xs font-black uppercase text-rose-400 hover:underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Filter and Search Panel */}
      <div className="bg-card border border-border/50 rounded-2xl p-4 md:p-5 shadow-xl shadow-slate-950/20 relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[85px] rounded-full -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col md:flex-row gap-3 relative z-10">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por técnico u observaciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border hover:border-emerald-500/30 focus:border-emerald-500/80 rounded-xl pl-10 pr-4 py-2.5 text-xs md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-all"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowFiltersPanel(p => !p)}
              className={`flex items-center gap-2 font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl border transition-all ${showFiltersPanel || selectedPredio !== "all" || selectedLote !== "all" || startDate || endDate
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-background border-border text-foreground hover:bg-card"
                }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filtros</span>
              {(selectedPredio !== "all" || selectedLote !== "all" || startDate || endDate) && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              )}
            </button>

            <button
              onClick={clearFilters}
              disabled={!(searchQuery || selectedPredio !== "all" || selectedLote !== "all" || startDate || endDate)}
              className="flex items-center gap-2 bg-background border border-border text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpiar Filtros</span>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {(showFiltersPanel || selectedPredio !== "all" || selectedLote !== "all" || startDate || endDate) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mt-4 pt-4 border-t border-border/30 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 relative z-10"
            >
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Predio</label>
                <select
                  value={selectedPredio}
                  onChange={(e) => { setSelectedPredio(e.target.value); setSelectedLote("all") }}
                  className="w-full bg-background border border-border focus:border-emerald-500/60 rounded-xl px-3 py-2.5 text-xs md:text-sm focus:outline-none text-foreground transition-all"
                >
                  <option value="all">Todos los predios</option>
                  {filterOptions.predios.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Lote</label>
                <select
                  value={selectedLote}
                  onChange={(e) => setSelectedLote(e.target.value)}
                  className="w-full bg-background border border-border focus:border-emerald-500/60 rounded-xl px-3 py-2.5 text-xs md:text-sm focus:outline-none text-foreground transition-all"
                >
                  <option value="all">Todos los lotes</option>
                  {filterOptions.lotes.map(l => (
                    <option key={l.id} value={l.id}>{l.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fecha Desde</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-background border border-border focus:border-emerald-500/60 rounded-xl px-3 py-2.5 text-xs md:text-sm focus:outline-none text-foreground transition-all [color-scheme:dark]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fecha Hasta</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-background border border-border focus:border-emerald-500/60 rounded-xl px-3 py-2.5 text-xs md:text-sm focus:outline-none text-foreground transition-all [color-scheme:dark]"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Inspections Section */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-card border border-border/50 rounded-2xl gap-4">
          <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin" />
          <p className="text-sm text-muted-foreground font-black uppercase tracking-widest">
            Cargando historial de inspecciones...
          </p>
        </div>
      ) : filteredInspecciones.length === 0 ? (
        <div className="bg-card border border-border/50 rounded-2xl p-16 text-center flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 bg-background rounded-2xl border border-border flex items-center justify-center">
            <ClipboardList className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">No se encontraron inspecciones</h3>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
              {inspecciones.length === 0
                ? "Aún no tienes ninguna inspección fitosanitaria finalizada registrada en el sistema."
                : "No hay registros que coincidan con los filtros aplicados. Intenta ajustando los filtros."}
            </p>
          </div>
          {inspecciones.length > 0 && (
            <button
              onClick={clearFilters}
              className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-xs md:text-sm font-black uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile cards */}
          <div className="grid grid-cols-1 md:hidden gap-5">
            {filteredInspecciones.map(ins => (
              <motion.div
                key={ins.id_inspeccion}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedInspection(ins)}
                className="bg-card border border-border/50 rounded-2xl p-5 shadow-md flex flex-col justify-between hover:border-emerald-500/40 cursor-pointer transition-all"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm font-semibold">
                    <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>
                      {formatLocalDateString(ins.fecha_programada, "short")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Lotes</p>
                      <p className="text-sm text-foreground truncate font-bold">
                        {ins.lotes_inspeccionados.join(", ") || "Ninguno"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Cultivos</p>
                      <p className="text-sm text-emerald-400 truncate font-bold">
                        {ins.cultivos_evaluados.join(", ") || "Ninguno"}
                      </p>
                    </div>
                  </div>

                  {ins.plagas_identificadas.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Plagas Identificadas</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ins.plagas_identificadas.map(p => (
                          <span key={p} className="text-[11px] font-bold px-3 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 uppercase">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Observaciones</p>
                    <p className="text-sm text-muted-foreground italic mt-1 leading-relaxed">
                      &ldquo;{ins.observaciones}&rdquo;
                    </p>
                  </div>
                </div>

                <div className="border-t border-border/30 mt-5 pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-xs font-black text-foreground italic truncate max-w-[140px]">
                      {ins.tecnico_nombre}
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-xl transition-all">
                    Ver inspección <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-card border border-border/50 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-card/60 border-b border-border/30 text-xs md:text-sm font-black uppercase tracking-widest text-muted-foreground">
                  <th className="py-4.5 px-6">Fecha</th>
                  <th className="py-4.5 px-6">Técnico</th>
                  <th className="py-4.5 px-6">Lotes / Cultivos</th>
                  <th className="py-4.5 px-6">Plagas Identificadas</th>
                  <th className="py-4.5 px-6 text-right">Inspección</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-sm font-semibold text-foreground">
                {filteredInspecciones.map(ins => (
                  <tr
                    key={ins.id_inspeccion}
                    onClick={() => setSelectedInspection(ins)}
                    className="hover:bg-card/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-5 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2.5 font-bold">
                        <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>
                          {formatLocalDateString(ins.fecha_programada, "long")}
                        </span>
                      </div>
                    </td>

                    <td className="py-5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-black text-foreground italic truncate max-w-[170px]">{ins.tecnico_nombre}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide mt-0.5">Evaluador Técnico</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-5 px-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Sprout className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="font-black text-foreground max-w-[220px] truncate" title={ins.lotes_inspeccionados.join(", ")}>
                            {ins.lotes_inspeccionados.join(", ") || "Sin registrar"}
                          </span>
                        </div>
                        {ins.cultivos_evaluados.length > 0 && (
                          <p className="text-xs text-emerald-400 font-bold max-w-[220px] truncate" title={ins.cultivos_evaluados.join(", ")}>
                            Cultivo: {ins.cultivos_evaluados.join(", ")}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="py-5 px-6">
                      {ins.plagas_identificadas.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                          {ins.plagas_identificadas.slice(0, 2).map(p => (
                            <span key={p} className="text-[11px] font-black px-3 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 uppercase tracking-wide">
                              {p}
                            </span>
                          ))}
                          {ins.plagas_identificadas.length > 2 && (
                            <span className="text-[11px] font-black px-2.5 py-1 rounded bg-card border border-border text-muted-foreground">
                              +{ins.plagas_identificadas.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Sin plagas</span>
                      )}
                    </td>

                    <td className="py-5 px-6 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 hover:bg-emerald-500/20 px-4 py-2 rounded-xl transition-all"
                      >
                        <span>Ver inspección</span>
                        <ChevronRight className="w-4 h-4 shrink-0" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectedInspection && (
          <InformeCompletoModal
            inspection={selectedInspection}
            onClose={() => setSelectedInspection(null)}
            filterPredioId={selectedPredio}
            filterLoteId={selectedLote}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
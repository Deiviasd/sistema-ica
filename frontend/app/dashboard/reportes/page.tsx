"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Calendar,
  MapPin,
  Sprout,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
  X,
  ClipboardList,
  AlertCircle,
  Pencil,
  Trash2,
  ShieldAlert
} from "lucide-react"

import { InformeCompletoModal } from "@/components/dashboard/components/InformeCompletoModal"
import { EditarInspeccionModal } from "./EditarInspeccionModal"
import { useReportesTecnicos } from "./ReportesTecnicos"

// ── Helper de formato de fecha ──────────────────────────────────
const formatFecha = (fecha: string, long = false) =>
  new Date(fecha).toLocaleDateString("es-ES", {
    year: "numeric",
    month: long ? "long" : "short",
    day: "numeric"
  })


// ── Componente ──────────────────────────────────────────────────
export default function ReportesTecnicosPage() {
  const {
    inspecciones,
    filteredInspecciones,
    filterOptions,
    plagas,
    loading,
    refreshing,
    error,
    deleteLoading,
    deleteError,
    editLoading,
    editError,
    selectedModal,
    setSelectedModal,
    searchQuery, setSearchQuery,
    selectedPredio, setSelectedPredio,
    selectedLugar, setSelectedLugar,
    selectedLote, setSelectedLote,
    startDate, setStartDate,
    endDate, setEndDate,
    showFiltersPanel, setShowFiltersPanel,
    hasActiveFilters,
    fetchData,
    clearFilters,
    handleDelete,
    handleSaveEdit,
    tecnicoNombre
  } = useReportesTecnicos()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-1 md:p-6 space-y-6 max-w-7xl mx-auto"
    >
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/30 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-foreground leading-snug">
            Reportes Técnicos de{" "}
            <span className="text-emerald-400">{tecnicoNombre}</span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-base mt-1">
            Consulta, filtra, edita o elimina las inspecciones fitosanitarias de las que eres responsable.
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

      {/* ── Error banner ── */}
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

      {/* ── Panel de filtros ── */}
      <div className="bg-card border border-border/50 rounded-2xl p-4 md:p-5 shadow-xl shadow-slate-950/20 relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[85px] rounded-full -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col md:flex-row gap-3 relative z-10">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por predio, lugar u observaciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-border hover:border-emerald-500/30 focus:border-emerald-500/80 rounded-xl pl-10 pr-4 py-2.5 text-xs md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-all"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowFiltersPanel(p => !p)}
              className={`flex items-center gap-2 font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl border transition-all ${showFiltersPanel || hasActiveFilters
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-slate-950 border-border text-foreground hover:bg-slate-900"
                }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filtros</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              )}
            </button>

            <button
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="flex items-center gap-2 bg-slate-950 border border-border text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpiar</span>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {(showFiltersPanel || hasActiveFilters) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mt-4 pt-4 border-t border-border/30 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 relative z-10"
            >
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Predio</label>
                <select
                  value={selectedPredio}
                  onChange={(e) => { setSelectedPredio(e.target.value); setSelectedLote("all") }}
                  className="w-full bg-slate-950 border border-border focus:border-emerald-500/60 rounded-xl px-3 py-2.5 text-xs md:text-sm focus:outline-none text-foreground transition-all"
                >
                  <option value="all">Todos los predios</option>
                  {filterOptions.predios.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Lugar de Producción</label>
                <select
                  value={selectedLugar}
                  onChange={(e) => setSelectedLugar(e.target.value)}
                  className="w-full bg-slate-950 border border-border focus:border-emerald-500/60 rounded-xl px-3 py-2.5 text-xs md:text-sm focus:outline-none text-foreground transition-all"
                >
                  <option value="all">Todos los lugares</option>
                  {filterOptions.lugares.map(l => (
                    <option key={l.id} value={l.id}>{l.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Lote</label>
                <select
                  value={selectedLote}
                  onChange={(e) => setSelectedLote(e.target.value)}
                  className="w-full bg-slate-950 border border-border focus:border-emerald-500/60 rounded-xl px-3 py-2.5 text-xs md:text-sm focus:outline-none text-foreground transition-all"
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
                  className="w-full bg-slate-950 border border-border focus:border-emerald-500/60 rounded-xl px-3 py-2.5 text-xs md:text-sm focus:outline-none text-foreground transition-all [color-scheme:dark]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fecha Hasta</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-border focus:border-emerald-500/60 rounded-xl px-3 py-2.5 text-xs md:text-sm focus:outline-none text-foreground transition-all [color-scheme:dark]"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Contenido principal ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-card border border-border/50 rounded-2xl gap-4">
          <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin" />
          <p className="text-sm text-muted-foreground font-black uppercase tracking-widest">
            Cargando reportes técnicos...
          </p>
        </div>
      ) : filteredInspecciones.length === 0 ? (
        <div className="bg-card border border-border/50 rounded-2xl p-16 text-center flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 bg-slate-950 rounded-2xl border border-border flex items-center justify-center">
            <ClipboardList className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">No se encontraron reportes</h3>
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

          {/* ── Mobile cards ── */}
          <div className="grid grid-cols-1 md:hidden gap-5">
            {filteredInspecciones.map(ins => (
              <motion.div
                key={ins.id_inspeccion}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border/50 rounded-2xl p-5 shadow-md flex flex-col justify-between hover:border-emerald-500/40 transition-all"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm font-semibold">
                    <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{formatFecha(ins.fecha_programada)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Predio</p>
                      <p className="text-sm text-white truncate font-bold">{ins.predio_nombre}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Lugar</p>
                      <p className="text-sm text-emerald-400 truncate font-bold">{ins.lugar_nombre}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Lotes</p>
                      <p className="text-sm text-white truncate font-bold">
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
                    <p className="text-sm text-muted-foreground italic mt-1 leading-relaxed line-clamp-2">
                      &ldquo;{ins.observaciones}&rdquo;
                    </p>
                  </div>
                </div>

                <div className="border-t border-border/30 mt-5 pt-4 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedModal({ inspection: ins, mode: "view" })}
                    className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 px-3.5 py-2 rounded-xl transition-all"
                  >
                    Ver <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex gap-2">
                    {/* BOTÓN EDITAR — temporalmente deshabilitado
                    <button
                      onClick={() => setSelectedModal({ inspection: ins, mode: "edit" })}
                      className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-sky-400 bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 px-3.5 py-2 rounded-xl transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    */}
                    <button
                      onClick={() => setSelectedModal({ inspection: ins, mode: "delete" })}
                      className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 px-3.5 py-2 rounded-xl transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Desktop table ── */}
          <div className="hidden md:block bg-card border border-border/50 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/60 border-b border-border/30 text-xs font-black uppercase tracking-widest text-muted-foreground">
                  <th className="py-4 px-5">Fecha</th>
                  <th className="py-4 px-5">Lugar De Producion / Predio</th>
                  <th className="py-4 px-5">Lotes / Cultivos</th>
                  <th className="py-4 px-5">Plagas</th>
                  <th className="py-4 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-sm font-semibold text-foreground">
                {filteredInspecciones.map(ins => (
                  <tr
                    key={ins.id_inspeccion}
                    className="hover:bg-slate-900/30 transition-colors group"
                  >
                    <td className="py-5 px-5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5 font-bold">
                        <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{formatFecha(ins.fecha_programada, true)}</span>
                      </div>
                    </td>

                    <td className="py-5 px-5">
                      <div className="space-y-0.5">
                        <p className="font-black text-white truncate max-w-[180px]" title={ins.lugar_nombre}>
                          {ins.lugar_nombre}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                          <p className="text-xs text-emerald-400 font-bold truncate max-w-[160px]" title={ins.predio_nombre}>
                            {ins.predio_nombre}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-5 px-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Sprout className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span
                            className="font-black text-white max-w-[200px] truncate"
                            title={ins.lotes_inspeccionados.join(", ")}
                          >
                            {ins.lotes_inspeccionados.join(", ") || "Sin registrar"}
                          </span>
                        </div>
                        {ins.cultivos_evaluados.length > 0 && (
                          <p
                            className="text-xs text-emerald-400 font-bold max-w-[200px] truncate"
                            title={ins.cultivos_evaluados.join(", ")}
                          >
                            {ins.cultivos_evaluados.join(", ")}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="py-5 px-5">
                      {ins.plagas_identificadas.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-w-[190px]">
                          {ins.plagas_identificadas.slice(0, 2).map(p => (
                            <span
                              key={p}
                              className="text-[11px] font-black px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 uppercase tracking-wide"
                            >
                              {p}
                            </span>
                          ))}
                          {ins.plagas_identificadas.length > 2 && (
                            <span className="text-[11px] font-black px-2.5 py-1 rounded bg-slate-900 border border-border text-muted-foreground">
                              +{ins.plagas_identificadas.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Sin plagas</span>
                      )}
                    </td>

                    <td className="py-5 px-5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedModal({ inspection: ins, mode: "view" })}
                          className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/40 hover:bg-emerald-500/20 px-3.5 py-2 rounded-xl transition-all"
                        >
                          Ver <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        {/* BOTÓN EDITAR — temporalmente deshabilitado
                        <button
                          onClick={() => setSelectedModal({ inspection: ins, mode: "edit" })}
                          className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-sky-400 bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 px-3.5 py-2 rounded-xl transition-all"
                          title="Editar inspección"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        */}
                        <button
                          onClick={() => setSelectedModal({ inspection: ins, mode: "delete" })}
                          className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 px-3.5 py-2 rounded-xl transition-all"
                          title="Eliminar inspección"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modales ── */}
      <AnimatePresence>
        {selectedModal?.mode === "view" && (
          <InformeCompletoModal
            inspection={selectedModal.inspection}
            onClose={() => setSelectedModal(null)}
            filterPredioId={selectedPredio}
            filterLoteId={selectedLote}
          />
        )}

        {selectedModal?.mode === "delete" && (
          <motion.div
            key="delete-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedModal(null) }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.18 }}
              className="bg-card border border-border/50 rounded-2xl p-7 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-black text-foreground uppercase tracking-tight">
                    Eliminar Inspección
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    ¿Estás seguro de que deseas eliminar la inspección del{" "}
                    <span className="text-white font-bold">
                      {formatFecha(selectedModal.inspection.fecha_programada, true)}
                    </span>{" "}
                    en el predio{" "}
                    <span className="text-white font-bold">
                      {selectedModal.inspection.predio_nombre}
                    </span>
                    ? Esta acción no se puede deshacer.
                  </p>
                  {deleteError && (
                    <p className="text-xs text-rose-400 font-bold mt-3 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                      {deleteError}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setSelectedModal(null)}
                  disabled={deleteLoading}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 border border-border text-sm font-black uppercase tracking-wider text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(selectedModal.inspection.id_inspeccion)}
                  disabled={deleteLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-sm font-black uppercase tracking-wider text-rose-400 transition-all disabled:opacity-50"
                >
                  {deleteLoading
                    ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Eliminando...</>
                    : <><Trash2 className="w-3.5 h-3.5" /> Eliminar</>
                  }
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* MODAL EDITAR — temporalmente deshabilitado
        {selectedModal?.mode === "edit" && (
          <EditarInspeccionModal
            key={selectedModal.inspection.id_inspeccion}
            inspection={selectedModal.inspection}
            plagas={plagas}
            onClose={() => setSelectedModal(null)}
            onSave={handleSaveEdit}
            loading={editLoading}
            error={editError}
          />
        )}
        */}
      </AnimatePresence>
    </motion.div>
  )
}
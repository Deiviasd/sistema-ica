"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  X,
  Pencil,
  FileText,
  Bug,
  AlertCircle,
  RefreshCw,
  Save
} from "lucide-react"

import { EnrichedInspection, RawPlaga, DetalleEditado, DetallePayload, DetalleEnriquecido } from "./tipos"

type DetalleEnriquecidoRaw = DetalleEnriquecido & {
  id_detalle?: number | string
  cantidad_plantas_afectadas?: number
  plantas_totales?: number
  porcentaje_infestacion?: number
}

// ── Props ────────────────────────────────────────────────────────
export interface EditarInspeccionModalProps {
  inspection: EnrichedInspection
  plagas: RawPlaga[]
  onClose: () => void
  onSave: (id: string | number, generalObs: string, details: DetallePayload[]) => Promise<{ success: boolean; error?: string }>
  loading: boolean
  error: string | null
}

// ── Helper ───────────────────────────────────────────────────────
const getSeverity = (pct: number) => {
  if (pct > 20) return { label: "CRÍTICO",  badge: "bg-rose-500/10 border-rose-500/20 text-rose-400" }
  if (pct > 5)  return { label: "MODERADO", badge: "bg-amber-500/10 border-amber-500/20 text-amber-400" }
  return               { label: "LEVE",     badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" }
}

// ── Componente ───────────────────────────────────────────────────
export function EditarInspeccionModal({
  inspection,
  plagas,
  onClose,
  onSave,
  loading,
  error
}: EditarInspeccionModalProps) {
  const [generalObs, setGeneralObs] = useState(inspection.observaciones || "")

  const parseDetalles = (insp: EnrichedInspection): DetalleEditado[] =>
    (insp.detalles_enriquecidos || []).map(d => {
      const det = d as DetalleEnriquecidoRaw
      const obs          = det.observaciones_especificas || ""
      const plaga        = obs.match(/\[Plaga:(.+?)\]/)?.[1]?.trim()        || det.plaga_nombre || ""
      const recomendacion = obs.match(/\[Recomendacion:(.+?)\]/)?.[1]?.trim() || ""
      const nota         = obs.split("] | ").pop() || ""

      return {
        id_detalle:                 det.id_detalle,
        siembra_id:                 det.siembra_id,
        plaga_id:                   det.plaga_id?.toString() || "",
        plaga_nombre:               plaga,
        cantidad_plantas_afectadas: det.cantidad_plantas_afectadas || 0,
        plantas_totales:            det.plantas_totales || 0,
        porcentaje_infestacion:     det.porcentaje_infestacion || 0,
        lote_nombre:                det.lote_nombre || "Lote sin nombre",
        cultivo:                    det.cultivo     || "Cultivo sin registrar",
        recomendacion,
        nota
      }
    })

  const [detalles, setDetalles] = useState<DetalleEditado[]>(() => parseDetalles(inspection))

  // Actualizar un campo de un detalle y recalcular incidencia/severidad si aplica
  const handleDetailChange = (index: number, key: string, value: string | number) => {
    setDetalles(prev => {
      const updated = [...prev]
      const target  = { ...updated[index], [key]: value }

      if (key === "plaga_id") {
        const p = plagas.find(p => String(p.id_plaga) === String(value))
        target.plaga_nombre = p?.nombre_comun || ""
      }

      if (key === "cantidad_plantas_afectadas" || key === "plantas_totales") {
        const afectadas = Number(key === "cantidad_plantas_afectadas" ? value : target.cantidad_plantas_afectadas) || 0
        const totales   = Number(key === "plantas_totales"            ? value : target.plantas_totales)            || 1
        target.porcentaje_infestacion = Number(((afectadas / totales) * 100).toFixed(2))
      }

      updated[index] = target
      return updated
    })
  }

  // Construir payload y llamar a onSave
  const handleSave = () => {
    const payloadDetalles: DetallePayload[] = detalles.map(det => {
      const plagaName      = det.plaga_nombre || ""
      const obsEspecificas = `[Plaga: ${plagaName}] | [Recomendacion: ${det.recomendacion || "N/A"}] | ${det.nota || ""}`

      return {
        id_detalle:                 det.id_detalle,
        siembra_id:                 det.siembra_id,
        plaga_id:                   det.plaga_id ? Number(det.plaga_id) : null,
        cantidad_plantas_afectadas: Number(det.cantidad_plantas_afectadas),
        plantas_totales:            Number(det.plantas_totales),
        porcentaje_infestacion:     det.porcentaje_infestacion,
        observaciones_especificas:  obsEspecificas
      }
    })

    onSave(inspection.id_inspeccion, generalObs, payloadDetalles)
  }

  return (
    <motion.div
      key="edit-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ duration: 0.18 }}
        className="bg-card border border-border/50 rounded-2xl p-6 w-full max-w-2xl shadow-2xl my-8 relative flex flex-col max-h-[90vh]"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
              <Pencil className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground uppercase tracking-tight">
                Editar Inspección Fitosanitaria
              </h3>
              <p className="text-xs text-muted-foreground">
                Predio: <span className="text-white font-bold">{inspection.predio_nombre}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-900 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Contenido con scroll ── */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-2 -mr-2">

          {/* Observaciones Generales */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              Observaciones Generales de la Inspección
            </label>
            <textarea
              rows={3}
              value={generalObs}
              onChange={(e) => setGeneralObs(e.target.value)}
              placeholder="Escribe las observaciones generales sobre la visita..."
              className="w-full bg-slate-950 border border-border hover:border-sky-500/30 focus:border-sky-500/80 rounded-xl px-4 py-3 text-xs md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-all"
            />
          </div>

          {/* Evaluaciones por Lote */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-white border-b border-border/20 pb-2">
              Evaluaciones por Lote ({detalles.length})
            </h4>

            {detalles.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-4 bg-slate-950 rounded-xl border border-border/30">
                Esta inspección no tiene lotes evaluados registrados.
              </p>
            ) : (
              detalles.map((det, index) => {
                const severity = getSeverity(det.porcentaje_infestacion)

                return (
                  <div
                    key={det.id_detalle || index}
                    className="bg-slate-950/40 border border-border/40 rounded-xl p-5 space-y-4 hover:border-sky-500/20 transition-colors"
                  >
                    {/* Cabecera del detalle: lote + indicadores en vivo */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/20 pb-3">
                      <div>
                        <p className="text-xs font-black text-white uppercase tracking-wide">
                          Lote: {det.lote_nombre}
                        </p>
                        <p className="text-[10px] font-bold text-sky-400 uppercase mt-0.5">
                          Cultivo: {det.cultivo}
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className="text-[10px] text-muted-foreground font-bold">
                          Incidencia:{" "}
                          <span className="text-white font-black">
                            {det.porcentaje_infestacion.toFixed(1)}%
                          </span>
                        </span>
                        <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-widest ${severity.badge}`}>
                          {severity.label}
                        </span>
                      </div>
                    </div>

                    {/* Campos editables */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                      {/* Plaga */}
                      <div className="space-y-1.5 col-span-1 sm:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                          <Bug className="w-3.5 h-3.5 text-sky-400" />
                          Plaga Identificada
                        </label>
                        <select
                          value={det.plaga_id}
                          onChange={(e) => handleDetailChange(index, "plaga_id", e.target.value)}
                          className="w-full bg-slate-950 border border-border focus:border-sky-500/60 rounded-xl px-3 py-2.5 text-xs md:text-sm focus:outline-none text-foreground transition-all"
                        >
                          <option value="">-- Seleccionar Plaga --</option>
                          {plagas.map(p => (
                            <option key={p.id_plaga} value={p.id_plaga}>
                              {p.nombre_comun}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Plantas Afectadas */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Plantas Afectadas
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={det.cantidad_plantas_afectadas}
                          onChange={(e) => handleDetailChange(index, "cantidad_plantas_afectadas", parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-border focus:border-sky-500/60 rounded-xl px-3 py-2.5 text-xs md:text-sm focus:outline-none text-foreground transition-all"
                        />
                      </div>

                      {/* Plantas Totales */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Plantas Totales (Muestra)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={det.plantas_totales}
                          onChange={(e) => handleDetailChange(index, "plantas_totales", parseInt(e.target.value) || 1)}
                          className="w-full bg-slate-950 border border-border focus:border-sky-500/60 rounded-xl px-3 py-2.5 text-xs md:text-sm focus:outline-none text-foreground transition-all"
                        />
                      </div>

                      {/* Recomendación Técnica */}
                      <div className="space-y-1.5 col-span-1 sm:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Recomendación Técnica
                        </label>
                        <textarea
                          rows={2}
                          value={det.recomendacion}
                          onChange={(e) => handleDetailChange(index, "recomendacion", e.target.value)}
                          placeholder="Recomendaciones fitosanitarias para este lote..."
                          className="w-full bg-slate-950 border border-border hover:border-sky-500/30 focus:border-sky-500/80 rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none transition-all"
                        />
                      </div>

                      {/* Observaciones del lote */}
                      <div className="space-y-1.5 col-span-1 sm:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Observaciones
                        </label>
                        <textarea
                          rows={2}
                          value={det.nota}
                          onChange={(e) => handleDetailChange(index, "nota", e.target.value)}
                          placeholder="Detalles u observaciones específicas del lote..."
                          className="w-full bg-slate-950 border border-border hover:border-sky-500/30 focus:border-sky-500/80 rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none transition-all"
                        />
                      </div>

                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mt-4 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-2.5 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-400">{error}</p>
          </div>
        )}

        {/* ── Botones ── */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border/30 shrink-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-slate-900 border border-border text-sm font-black uppercase tracking-wider text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20 text-sm font-black uppercase tracking-wider text-sky-400 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Guardar Cambios
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

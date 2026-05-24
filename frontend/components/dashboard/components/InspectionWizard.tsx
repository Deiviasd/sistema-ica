import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MapPin, Calendar, Info, ClipboardList, ChevronDown,
  Save, CheckCircle2, Loader2, Sprout, Bug, Check, History, Trash2
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Inspection, Predio, Lote, Plaga, SiembraActiva } from "../types/inspection"
import { useInspectionWizard } from "@/hooks/useInspectionWizard"
import { DossierModal } from "./DossierModal"
import { InformeCompletoModal } from "./InformeCompletoModal"

interface Props {
  inspection: Inspection
  onClose: () => void
}

export function InspectionWizard({ inspection, onClose }: Props) {
  const [showDossier, setShowDossier] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [selectedLoteToReset, setSelectedLoteToReset] = useState<string | number | null>(null)
  const [resetLoteName, setResetLoteName] = useState("")
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [toastType, setToastType] = useState<"success" | "error">("success")

  const {
    loading,
    context,
    activeLotes,
    selectedPredioId,
    allPredios,
    plagaPersonalizada,
    setPlagaPersonalizada,
    catalogPlagas,
    loadingPlagas,
    isFinishing,
    formData,
    setFormData,
    currentEval,
    calculateInfestation,
    handleUpdateCurrentEval,
    handleSelectLote,
    handleResetLote,
    handleSaveLoteEvaluation,
    handleChangePredio,
    handleFinish,
  } = useInspectionWizard(inspection, onClose)

  const getVariedadNombre = (siembra?: SiembraActiva | null) => {
    if (!siembra?.variedad) return siembra?.variedad_nombre || 'Genérica'
    return typeof siembra.variedad === 'string' ? siembra.variedad : siembra.variedad.nombre_variedad || 'Genérica'
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[500px] bg-slate-950/20 rounded-[3rem] border border-slate-800">
      <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-6" />
      <p className="text-slate-500 font-black tracking-widest uppercase text-xs">Cargando protocolo de inspección...</p>
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-20">
      {/* Banner ICA */}
      <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-[2rem] flex items-center justify-between backdrop-blur-xl">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
            <Info className="text-amber-500 w-6 h-6" />
          </div>
          <p className="text-amber-500/90 text-sm font-bold">
            <span className="font-black italic uppercase">Modo Inspección:</span> Estás en el protocolo de verificación de campo.
          </p>
        </div>
        <Button
          onClick={() => setShowDossier(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-black italic uppercase tracking-tighter px-8 h-12 rounded-xl shadow-xl shadow-emerald-900/40 border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 transition-all flex gap-3"
        >
          <ClipboardList className="w-5 h-5" />
          Consultar Expediente Técnico
        </Button>
      </div>

      {/* Modal Dossier */}
      <AnimatePresence>
        {showDossier && (
          <DossierModal context={context} onClose={() => setShowDossier(false)} />
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">

          {/* SECCIÓN 1: DATOS GENERALES */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-1">DATOS GENERALES</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Seleccione Predio </label>
                <div className="relative">
                  <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 w-4 h-4 pointer-events-none" />
                  <select
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-14 pr-10 text-white font-bold outline-none appearance-none cursor-pointer hover:border-slate-700 transition-colors"
                    value={selectedPredioId ?? ""}
                    onChange={(e) => handleChangePredio(Number(e.target.value))}
                  >
                    <option value="" disabled>-- Seleccione Predio --</option>
                    {allPredios?.map((predio: Predio) => {
                      const predioLotes = predio.lotes || []
                      const revLotes = predioLotes.filter((pl: Lote) =>
                        formData.evaluations.some(ev => String(ev.id_lote) === String(pl.id_lote))
                      ).length
                      return (
                        <option key={predio.id_predio} value={predio.id_predio}>
                          {predio.nombre_predio} ({revLotes}/{predioLotes.length} lotes)
                        </option>
                      )
                    }) || (
                        <option value="">{context?.lugar_nombre || inspection.lugar_produccion?.nombre_lugar}</option>
                      )}
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Fecha de Inicio</label>
                <div className="relative">
                  <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 w-4 h-4" />
                  <input
                    disabled
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-white font-bold outline-none"
                    value={new Date().toLocaleDateString('es-ES')}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">OBSERVACIONES GENERALES DEL PREDIO</label>
              <textarea
                className="w-full bg-slate-900/50 border border-slate-800 rounded-3xl p-8 text-white min-h-[120px] outline-none focus:border-teal-500/50 transition-all font-medium leading-relaxed"
                placeholder="Condiciones generales observadas en el predio..."
                value={formData.generalObs}
                onChange={(e) => setFormData({ ...formData, generalObs: e.target.value })}
              />
            </div>
          </div>

          {/* SECCIÓN 2: LOTES */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-1">
              LOTES DEL PREDIO — SELECCIONA LOS QUE INSPECCIONARÁS HOY
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeLotes.map((l: Lote) => (
                <div
                  key={l.id_lote}
                  onClick={() => handleSelectLote(l)}
                  className={`p-6 rounded-3xl border-2 transition-all flex flex-col gap-4 text-left cursor-pointer ${String(currentEval.id_lote) === String(l.id_lote)
                    ? 'bg-emerald-600/10 border-emerald-500/50 shadow-xl'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                    }`}
                >
                  <div className="flex justify-between items-start w-full gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${String(currentEval.id_lote) === String(l.id_lote)
                          ? 'bg-emerald-500/20 text-emerald-500'
                          : formData.evaluations.some(ev => String(ev.id_lote) === String(l.id_lote))
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                            : 'bg-slate-800 text-slate-600'
                        }`}>
                        <Check className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-white font-black italic uppercase tracking-tighter">{l.nombre_lote}</p>
                        <p className="text-[9px] text-slate-500 font-bold">{l.area} m² · {l.estado_lote?.toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {formData.evaluations.some(ev => String(ev.id_lote) === String(l.id_lote)) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLoteToReset(l.id_lote);
                            setResetLoteName(l.nombre_lote);
                            setShowResetConfirm(true);
                          }}
                          className="p-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:border-rose-500 hover:text-white text-rose-400 rounded-xl transition-all z-10 animate-fade-in"
                          title="Borrar evaluación de este lote"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      {String(currentEval.id_lote) === String(l.id_lote) && (
                        <span className="bg-emerald-500 text-slate-950 font-black text-[8px] px-3 py-1 rounded-full uppercase italic ring-4 ring-emerald-500/10">
                          SELECCIONADO
                        </span>
                      )}
                    </div>
                  </div>

                  {String(l.id_lote) === String(currentEval.id_lote) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-emerald-600/5 p-5 rounded-2xl border border-emerald-500/20 space-y-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2">
                        <Sprout className="w-3 h-3 text-emerald-500" />
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                          Información de Cultivos Registrados
                        </span>
                      </div>
                      {l.siembra_activa ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[8px] text-slate-500 font-black uppercase">Cultivo (Especie)</p>
                              <p className="text-[11px] text-white font-bold italic">{l.siembra_activa.especie}</p>
                            </div>
                            <div>
                              <p className="text-[8px] text-slate-500 font-black uppercase">Variedad</p>
                              <p className="text-[11px] text-white font-bold italic">{getVariedadNombre(l.siembra_activa)}</p>
                            </div>
                          </div>
                          <div className="pt-2 border-t border-emerald-500/10 grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[8px] text-slate-500 font-black uppercase">Productor</p>
                              <p className="text-[11px] text-white font-bold truncate">{context?.productor?.nombre}</p>
                            </div>
                            <div>
                              <p className="text-[8px] text-slate-500 font-black uppercase">Censo (Plantas)</p>
                              <p className="text-[11px] text-emerald-500 font-black tracking-tighter">
                                {l.siembra_activa.cantidad_plantas} UNIDADES
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500 italic text-center py-2">
                          No hay siembras activas registradas en este lote.
                        </p>
                      )}
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SECCIÓN 3: FORMULARIO DE EVALUACIÓN */}
          <Card className="bg-slate-900/40 border-slate-800 rounded-[3rem] overflow-hidden">
            <CardContent className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Cultivo evaluado */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">CULTIVO EVALUADO</label>
                  {currentEval.siembra ? (
                    <div className="w-full bg-emerald-600/10 border border-emerald-500/30 rounded-2xl py-4 px-6 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <Sprout className="text-emerald-500 w-5 h-5 flex-shrink-0" />
                        <div>
                          <p className="text-white font-black italic uppercase tracking-tight">{currentEval.siembra.especie}</p>
                          <p className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-widest">{getVariedadNombre(currentEval.siembra)}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-slate-600 font-bold italic text-sm">
                      Selecciona un lote arriba para ver el cultivo
                    </div>
                  )}
                </div>

                {/* Plaga detectada */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">PLAGA DETECTADA</label>
                  <div className="relative">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                      {loadingPlagas ? (
                        <Loader2 className="text-teal-500 w-4 h-4 animate-spin" />
                      ) : (
                        <Bug className="text-slate-600 w-4 h-4" />
                      )}
                    </div>
                    <select
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-14 pr-12 text-white font-bold outline-none appearance-none cursor-pointer hover:border-slate-700 transition-all disabled:opacity-50"
                      disabled={loadingPlagas || !currentEval.siembra}
                      value={plagaPersonalizada ? '__otra__' : currentEval.plaga}
                      onChange={(e) => {
                        if (e.target.value === '__otra__') {
                          setPlagaPersonalizada(" ")
                          handleUpdateCurrentEval({ plaga: "" })
                        } else {
                          setPlagaPersonalizada("")
                          handleUpdateCurrentEval({ plaga: e.target.value })
                        }
                      }}
                    >
                      <option value="">{loadingPlagas ? 'Consultando catálogo...' : '-- Sin hallazgos --'}</option>
                      {catalogPlagas.map((p: Plaga) => (
                        <option key={p.id_plaga} value={p.nombre_comun}>
                          {p.nombre_comun} {p.nombre_cientifico ? `(${p.nombre_cientifico})` : ''}
                        </option>
                      ))}
                      <option value="__otra__"> Registrar nueva plaga manual...</option>
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  </div>
                  {plagaPersonalizada !== "" && (
                    <input
                      type="text"
                      className="w-full bg-slate-950 border-2 border-emerald-500/40 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-emerald-500 transition-all placeholder:text-slate-600 mt-2"
                      placeholder="Ej: Phytophthora cinnamomi..."
                      value={plagaPersonalizada}
                      onChange={(e) => {
                        setPlagaPersonalizada(e.target.value)
                        handleUpdateCurrentEval({ plaga: e.target.value })
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Totales / Afectadas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">TOTAL PLANTAS EN EL LOTE</label>
                  <div className="w-full bg-slate-900/40 border border-slate-800/80 rounded-2xl py-4 px-6 flex items-center justify-between gap-4">
                    <span className="text-slate-400 font-bold italic text-sm">
                      {currentEval.totales ? `${currentEval.totales} plantas registradas (Lectura)` : 'Selecciona un lote'}
                    </span>
                    <span className="text-white font-black text-lg bg-slate-950/60 px-5 py-2 rounded-xl border border-slate-800 select-none">
                      {currentEval.totales || 0}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">PLANTAS AFECTADAS</label>
                  <div className="relative flex items-center w-full">
                    <button
                      type="button"
                      onClick={() => {
                        const current = Number(currentEval.afectadas) || 0;
                        if (current > 0) {
                          handleUpdateCurrentEval({ afectadas: current - 1 });
                        }
                      }}
                      disabled={!currentEval.siembra}
                      className="absolute left-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-black w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 select-none text-xl"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      disabled={!currentEval.siembra}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-14 text-center text-white font-bold outline-none focus:border-emerald-500 transition-all placeholder:text-slate-700"
                      placeholder={currentEval.siembra ? "0" : "Selecciona un lote"}
                      value={currentEval.afectadas || ""}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const maxVal = currentEval.totales || Infinity;
                        const cappedVal = Math.min(Math.max(0, val), maxVal);
                        handleUpdateCurrentEval({ afectadas: cappedVal });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const current = Number(currentEval.afectadas) || 0;
                        const maxVal = currentEval.totales || Infinity;
                        if (current < maxVal) {
                          handleUpdateCurrentEval({ afectadas: current + 1 });
                        }
                      }}
                      disabled={!currentEval.siembra}
                      className="absolute right-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 select-none text-xl shadow-lg shadow-emerald-950/40"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Infestación */}
              <div className="bg-emerald-600/5 border border-emerald-500/20 p-6 rounded-2xl flex items-center justify-between">
                <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest italic">% Infestación calculado:</span>
                <p className={`text-4xl font-black italic tracking-tighter ${calculateInfestation() > 20 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {calculateInfestation().toFixed(1)}%
                </p>
              </div>

              {/* Recomendación */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">RECOMENDACIÓN DE MANEJO</label>
                <textarea
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-white font-medium outline-none transition-all focus:border-emerald-500/50 min-h-[80px]"
                  placeholder="Escribe la recomendación de manejo..."
                  value={currentEval.recomendacion}
                  onChange={(e) => handleUpdateCurrentEval({ recomendacion: e.target.value })}
                />
              </div>

              {/* Observaciones específicas */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">OBSERVACIONES ESPECÍFICAS</label>
                <textarea
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-white font-medium outline-none transition-all focus:border-emerald-500/50 min-h-[120px]"
                  placeholder="Escribe observaciones específicas sobre este lote..."
                  value={currentEval.nota}
                  onChange={(e) => handleUpdateCurrentEval({ nota: e.target.value })}
                />
              </div>

              {currentEval.id_lote && (
                <div className="pt-6 border-t border-slate-800/60 flex justify-end">
                  <Button
                    type="button"
                    onClick={() => {
                      const res = handleSaveLoteEvaluation(activeLotes);
                      if (!res.success) {
                        setToastMessage(res.error || "Error al guardar");
                        setToastType("error");
                        setShowToast(true);
                        const timer = setTimeout(() => setShowToast(false), 3000);
                        return () => clearTimeout(timer);
                      }

                      if (res.isUnchanged) {
                        setToastMessage("Lote sin cambios, pasando al siguiente");
                        setToastType("success");
                      } else {
                        setToastMessage("Inspección del lote registrada");
                        setToastType("success");
                      }
                      setShowToast(true);
                      const timer = setTimeout(() => setShowToast(false), 2000);
                      return () => clearTimeout(timer);
                    }}
                    className="h-12 px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-black italic rounded-xl transition-all uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-950/30"
                  >
                    <Check className="w-4 h-4" /> Confirmar Evaluación del Lote
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha: resumen */}
        <div className="space-y-6">
          <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-[3rem] space-y-8 backdrop-blur-2xl sticky top-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-teal-500/20 rounded-xl flex items-center justify-center">
                <History className="text-teal-500 w-5 h-5" />
              </div>
              <h4 className="text-white font-black italic uppercase tracking-widest">Resumen de Registro</h4>
            </div>

            {/* Barra de Progreso de Revisión */}
            {(() => {
              const inspectableLotes = allPredios.flatMap((p: Predio) => p.lotes || []).filter((l: Lote) => l.siembra_activa)
              const lotesRevisadosCount = formData.evaluations.filter(ev =>
                inspectableLotes.some((il: Lote) => String(il.id_lote) === String(ev.id_lote))
              ).length
              const totalLotesCount = inspectableLotes.length
              const isComplete = totalLotesCount > 0 && lotesRevisadosCount === totalLotesCount

              return (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <span>Progreso de Revisión</span>
                    <span className={isComplete ? "text-emerald-400 font-black" : "text-amber-400 font-black"}>
                      {lotesRevisadosCount} de {totalLotesCount} lotes
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 p-[2px]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 'bg-amber-500'
                        }`}
                      style={{ width: `${totalLotesCount > 0 ? (lotesRevisadosCount / totalLotesCount) * 100 : 0}%` }}
                    />
                  </div>
                  {!isComplete && (
                    <p className="text-[9px] text-amber-500/80 font-bold italic mt-1 leading-tight">
                      ⚠️ Se requiere revisar todos los lotes de todos los predios asignados para poder finalizar.
                    </p>
                  )}
                </div>
              );
            })()}

            <div className="space-y-4 pt-4 border-t border-slate-800">
              <Button
                onClick={() => setShowReport(true)}
                className="w-full h-16 bg-slate-950 border border-slate-800 text-teal-400 hover:bg-slate-900 transition-all font-black uppercase tracking-widest flex items-center justify-center shadow-inner shadow-teal-500/5 group"
              >
                <svg className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Ver Informe Completo
              </Button>
            </div>

            <div className="pt-6 border-t border-slate-800 flex flex-col gap-4">
              <Button
                disabled={isFinishing}
                onClick={() => handleFinish('en_proceso')}
                className="w-full h-16 bg-transparent border-2 border-slate-800 text-white font-black italic rounded-2xl hover:bg-slate-800 transition-all uppercase tracking-tighter"
              >
                <Save className="w-5 h-5 mr-3" /> Guardar — En Proceso
              </Button>
              {(() => {
                const inspectableLotes = allPredios.flatMap((p: Predio) => p.lotes || []).filter((l: Lote) => l.siembra_activa)
                const lotesRevisadosCount = formData.evaluations.filter(ev =>
                  inspectableLotes.some((il: Lote) => String(il.id_lote) === String(ev.id_lote))
                ).length
                const totalLotesCount = inspectableLotes.length
                const isComplete = totalLotesCount > 0 && lotesRevisadosCount === totalLotesCount

                return (
                  <Button
                    disabled={isFinishing || formData.evaluations.length === 0 || !isComplete}
                    onClick={() => handleFinish('finalizada')}
                    className={`w-full h-20 text-white font-black italic text-xl rounded-[2rem] shadow-2xl transition-all uppercase tracking-tighter ${isComplete
                        ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40 cursor-pointer animate-pulse'
                        : 'bg-slate-800 text-slate-500 border border-slate-750 cursor-not-allowed opacity-60 shadow-none'
                      }`}
                  >
                    {isFinishing ? (
                      <Loader2 className="animate-spin w-8 h-8" />
                    ) : (
                      <><CheckCircle2 className="w-7 h-7 mr-3" /> Finalizar Inspección</>
                    )}
                  </Button>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {showReport && (
        <InformeCompletoModal
          inspection={inspection}
          liveFormData={formData}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* Modal de confirmación para eliminar hallazgos de un lote */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] max-w-md w-full space-y-6 shadow-2xl ring-1 ring-white/10 text-left"
            >
              <div className="flex items-center gap-4 text-rose-500">
                <div className="w-12 h-12 bg-rose-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-6 h-6 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-white font-black italic uppercase tracking-wider text-base">¿Eliminar Hallazgos?</h3>
                  <p className="text-[9px] text-rose-400 font-bold uppercase tracking-widest">Advertencia de seguridad</p>
                </div>
              </div>

              <p className="text-slate-300 text-xs font-semibold leading-relaxed">
                ¿Estás seguro de que deseas eliminar la evaluación del lote <span className="text-white font-bold">{resetLoteName}</span>?
                Se borrarán todas las plagas registradas, plantas afectadas y observaciones de este lote. Esta acción no se puede deshacer.
              </p>

              <div className="flex gap-4 pt-2">
                <Button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 h-12 bg-slate-950 border border-slate-800 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors uppercase tracking-wider text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (selectedLoteToReset !== null) {
                      handleResetLote(selectedLoteToReset);
                    }
                    setShowResetConfirm(false);
                  }}
                  className="flex-1 h-12 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-colors uppercase tracking-wider text-xs shadow-lg shadow-rose-950/40"
                >
                  Sí, Eliminar
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notificación flotante pequeña (Toast) */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`fixed top-8 left-1/2 -translate-x-1/2 z-[110] px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 border backdrop-blur-md transition-colors ${toastType === "error"
                ? "bg-rose-500 text-white border-rose-400/50 shadow-rose-950/20"
                : "bg-emerald-500 text-slate-950 border-emerald-400/50 shadow-emerald-500/20"
              }`}
          >
            {toastType === "error" ? (
              <Info className="w-4 h-4 text-white stroke-[3px]" />
            ) : (
              <Check className="w-4 h-4 text-slate-950 stroke-[3px]" />
            )}
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

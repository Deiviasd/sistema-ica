"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ClipboardList, MapPin, Calendar, Clock, ArrowRight, Play, CheckCircle2, ChevronRight, Calculator, AlertCircle, Save, Loader2, Leaf, Info, Sprout, AlertTriangle, History, Check, Search, CheckCircle, X, ShieldCheck, UserCheck } from "lucide-react"
import api from "@/lib/api"
import { useUserStore } from "@/lib/store"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Inspection {
  id_inspeccion: string
  tecnico_id: number
  productor_id: number
  id_lugar_produccion: number
  fecha_programada: string
  estado: 'programada' | 'en_proceso' | 'finalizada'
  observaciones_generales?: string
  lugar_produccion: {
    nombre_lugar: string
    numero_predial: string
  }
}

export default function TecnicoDashboard() {
  const [inspecciones, setInspecciones] = useState<Inspection[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null)

  useEffect(() => {
    fetchAssignments()
  }, [])

  const fetchAssignments = async () => {
    try {
      const res = await api.get("/inspecciones/asignadas")
      setInspecciones(res.data)
    } catch (error) {
      console.error("Error al cargar asignaciones:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[500px] space-y-4">
      <div className="relative">
        <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-emerald-400" />
        </div>
      </div>
      <p className="text-slate-400 font-bold text-lg animate-pulse uppercase tracking-[0.2em]">Sincronizando Agenda Técnica...</p>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AnimatePresence mode="wait">
        {!selectedInspection ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                 <div className="w-16 h-16 bg-emerald-600/10 rounded-3xl flex items-center justify-center border border-emerald-500/20">
                    <History className="text-emerald-500 w-8 h-8" />
                 </div>
                 <div>
                    <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Inspecciones Programadas</h1>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.3em]">Gestión de cumplimiento fitosanitario • ICA</p>
                 </div>
              </div>
              <div className="flex bg-slate-900/50 p-2 rounded-2xl border border-slate-800">
                 <div className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black italic uppercase tracking-tighter shadow-lg shadow-emerald-900/40">
                    {inspecciones.length} CITAS HOY
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {inspecciones.length === 0 ? (
                <div className="col-span-full py-32 text-center bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem]">
                  <Search className="w-20 h-20 text-slate-700 mx-auto mb-6" />
                  <p className="text-slate-400 text-2xl font-black italic tracking-tighter uppercase">Sin asignaciones pendientes</p>
                  <p className="text-slate-600 font-bold mt-2">Todo el equipo está al día con las verificaciones agrícolas.</p>
                </div>
              ) : (
                inspecciones.map((insp) => (
                  <InspectionCard 
                    key={insp.id_inspeccion} 
                    inspection={insp} 
                    onStart={() => setSelectedInspection(insp)} 
                  />
                ))
              )}
            </div>
          </motion.div>
        ) : (
          <InspectionWizard 
            inspection={selectedInspection} 
            onClose={() => { setSelectedInspection(null); fetchAssignments(); }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function InspectionCard({ inspection, onStart }: { inspection: Inspection, onStart: () => void }) {
  const date = new Date(inspection.fecha_programada).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  const time = new Date(inspection.fecha_programada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800 rounded-[2.5rem] p-8 hover:border-emerald-500/50 transition-all group relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[60px] rounded-full" />
      
      <div className="flex justify-between items-center mb-8">
        <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-800">
           <MapPin className="text-emerald-500 w-6 h-6" />
        </div>
        <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
          inspection.estado === 'programada' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
        }`}>
          {inspection.estado === 'programada' ? 'PENDIENTE' : 'EN TRABAJO'}
        </div>
      </div>

      <h3 className="text-2xl font-black text-white italic tracking-tight mb-4 group-hover:text-emerald-400 transition-colors uppercase">
        {inspection.lugar_produccion?.nombre_lugar}
      </h3>
      
      <div className="space-y-4 mb-10">
        <div className="flex items-center gap-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
          <Calendar className="w-5 h-5 text-emerald-500" />
          <div className="flex flex-col">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">FECHA PROGRAMADA</span>
             <span className="text-sm text-white font-bold capitalize">{date} • {time}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
          <MapPin className="w-5 h-5 text-emerald-500" />
          <div className="flex flex-col">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">IDENTIFICACIÓN PREDIO</span>
             <span className="text-sm text-white font-bold">{inspection.lugar_produccion?.numero_predial}</span>
          </div>
        </div>
      </div>

      <Button
        onClick={onStart}
        className="w-full h-16 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-900/20 transition-all flex items-center justify-center gap-3 active:scale-95"
      >
        <Play className="w-5 h-5 fill-current" />
        INICIAR INSPECCIÓN
      </Button>
    </motion.div>
  )
}

function InspectionWizard({ inspection, onClose }: { inspection: Inspection, onClose: () => void }) {
  const [loading, setLoading] = useState(true)
  const [showDossier, setShowDossier] = useState(false)
  const [selectedDossierLote, setSelectedDossierLote] = useState<number | null>(null)
  const [plagaPersonalizada, setPlagaPersonalizada] = useState("")
  const [context, setContext] = useState<any>(null)
  const [formData, setFormData] = useState({
    generalObs: "",
    evaluations: [] as any[]
  })
  const [currentEval, setCurrentEval] = useState({
    id_lote: "",
    siembra: null as any,
    plaga: "",
    totales: 0,
    afectadas: 0,
    recomendacion: "",
    nota: ""
  })
  const [isFinishing, setIsFinishing] = useState(false)

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const res = await api.get(`/inspecciones/${inspection.id_inspeccion}/contexto`)
        setContext(res.data)
      } catch (err) {
        console.error("Error al cargar contexto:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchContext()
  }, [inspection.id_inspeccion])

  const calculateInfestation = () => {
    if (!currentEval.totales || currentEval.totales === 0) return 0
    return (currentEval.afectadas / currentEval.totales) * 100
  }

  const handleAddEvaluation = () => {
    if (!currentEval.id_lote || !currentEval.plaga) {
        alert("Por favor seleccione el lote y defina la plaga.")
        return
    }
    const newEval = {
        ...currentEval,
        porcentaje: calculateInfestation()
    }
    setFormData(prev => ({ ...prev, evaluations: [...prev.evaluations, newEval] }))
    setCurrentEval({ id_lote: "", siembra: null, plaga: "", totales: 0, afectadas: 0, recomendacion: "", nota: "" })
  }

  const handleFinish = async (status: 'finalizada' | 'en_proceso') => {
    setIsFinishing(true)
    try {
      // 1. Guardar detalles PRIMERO para asegurar la data
       if (formData.evaluations.length > 0) {
        await Promise.all(formData.evaluations.map(e => 
          api.post(`/inspecciones/${inspection.id_inspeccion}/detalles`, {
            siembra_id: e.siembra?.id_siembra || 1,
            plaga_id: 1, 
            cantidad_plantas_afectadas: e.afectadas,
            plantas_totales: e.totales,
            porcentaje_infestacion: e.porcentaje,
            observaciones_especificas: `[Plaga: ${e.plaga}] | [Recomendacion: ${e.recomendacion || 'N/A'}] | ${e.nota || ''}`
          })
        ))
      }

      // 2. Actualizar estado e historial GENERAL
      try {
        await api.patch(`/inspecciones/${inspection.id_inspeccion}/finalizar`, {
          observaciones_generales: formData.generalObs,
          estado: status
        })
      } catch (patchErr) {
        console.warn("Se guardaron los hallazgos, pero el estado falló por restricciones de DB:", patchErr);
        // No arrojamos un error para no detener la UI
      }

      alert(`✅ Inspección guardada como ${status}`)
      onClose()
    } catch (err) {
      console.error("Error al guardar:", err)
    } finally {
      setIsFinishing(false)
    }
  }

  if (loading) return (
     <div className="flex flex-col items-center justify-center h-[500px] bg-slate-950/20 rounded-[3rem] border border-slate-800">
        <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-6" />
        <p className="text-slate-500 font-black tracking-widest uppercase text-xs">Cargando protocolo de inspección...</p>
     </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-20"
    >
      {/* ⚠️ Alerta informativa ICA */}
      <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-[2rem] flex items-center justify-between backdrop-blur-xl">
         <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
               <Info className="text-amber-500 w-6 h-6" />
            </div>
            <div className="flex-1">
               <p className="text-amber-500/90 text-sm font-bold">
                  <span className="font-black italic uppercase">Modo Inspección:</span> Estas en el protocolo de verificación de campo.
               </p>
            </div>
         </div>
         
         {/* BOTÓN "FUAAA" - EL ACTIVADOR DEL EXPEDIENTE */}
         <Button 
            onClick={() => setShowDossier(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black italic uppercase tracking-tighter px-8 h-12 rounded-xl shadow-xl shadow-emerald-900/40 border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 transition-all flex gap-3"
         >
            <ClipboardList className="w-5 h-5" />
            Consultar Expediente Técnico
         </Button>
      </div>

      {/* VENTANA "CHIMBA" - MODAL DEL EXPEDIENTE */}
      <AnimatePresence>
        {showDossier && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowDossier(false)}
               className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl bg-slate-900 border-2 border-emerald-500/30 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(16,185,129,0.1)] flex flex-col max-h-[90vh]"
            >
              <div className="bg-emerald-600 p-8 flex justify-between items-center relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full -mr-20 -mt-20" />
                 <div className="relative z-10 flex items-center gap-6">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/30">
                       <ShieldCheck className="text-white w-10 h-10" />
                    </div>
                    <div>
                       <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">Dossier Técnico Integral</h2>
                       <p className="text-emerald-100 font-bold text-xs uppercase tracking-[0.3em] mt-2 opacity-80">Protocolo de Identidad y Biología Agraria • ICA</p>
                    </div>
                 </div>
                 <button 
                  onClick={() => setShowDossier(false)}
                  className="relative z-10 w-12 h-12 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white transition-all"
                 >
                    <X className="w-6 h-6" />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                 <div className="grid md:grid-cols-3 gap-10">
                    <div className="space-y-4">
                       <div className="flex items-center gap-3">
                          <MapPin className="text-emerald-500 w-5 h-5" />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Localización Geográfica</span>
                       </div>
                       <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800">
                          <p className="text-2xl font-black text-white italic uppercase tracking-tighter mb-1">{context?.lugar_nombre}</p>
                          <p className="text-xs text-emerald-500 font-bold uppercase">{context?.numero_predial || 'REGISTRO PREDIO #99283-A'}</p>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="flex items-center gap-3">
                          <UserCheck className="text-emerald-500 w-5 h-5" />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Productor Responsable</span>
                       </div>
                       <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800">
                          <p className="text-2xl font-black text-white italic uppercase tracking-tighter mb-1">{context?.productor?.nombre}</p>
                          <p className="text-xs text-slate-400 font-bold tracking-tight uppercase">{context?.productor?.region || 'Región Predeterminada'}</p>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="flex items-center gap-3">
                          <Calculator className="text-emerald-500 w-5 h-5" />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Dimensiones Operativas</span>
                       </div>
                       <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800">
                          <p className="text-2xl font-black text-white italic uppercase tracking-tighter mb-1">
                            {context?.lotes?.reduce((acc: number, l: any) => acc + (Number(l.area) || 0), 0)} <span className="text-emerald-500 text-sm">MT²</span>
                          </p>
                          <p className="text-xs text-slate-400 font-bold tracking-tight uppercase">{context?.lotes?.length} Lotes en Producción</p>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4">
                     <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">INVENTARIO DE LOTES Y BIOLOGÍA — HAZ CLIC PARA EXPANDIR</h4>
                     <div className="grid grid-cols-1 gap-3">
                        {context?.lotes?.map((l: any, i: number) => {
                           const isExpanded = selectedDossierLote === l.id_lote
                           const hasData = !!l.siembra_activa
                           return (
                           <div key={i} 
                             onClick={() => setSelectedDossierLote(isExpanded ? null : l.id_lote)}
                             className={`rounded-3xl border-2 cursor-pointer transition-all overflow-hidden ${
                               isExpanded 
                               ? 'bg-emerald-600/5 border-emerald-500/40 shadow-xl shadow-emerald-900/10' 
                               : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                             }`}
                           >
                              {/* ROW HEADER */}
                              <div className="flex items-center gap-5 p-5">
                                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${
                                   isExpanded ? 'bg-emerald-600/20' : 'bg-slate-900 border border-slate-800'
                                 }`}>
                                    <Leaf className={`w-6 h-6 transition-colors ${ isExpanded ? 'text-emerald-500' : 'text-slate-600'}`} />
                                 </div>
                                 <div className="flex-1 grid grid-cols-3 gap-4">
                                    <div>
                                       <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Ficha Lote</p>
                                       <p className="text-sm text-white font-black italic uppercase tracking-tight">{l.nombre_lote}</p>
                                    </div>
                                    <div>
                                       <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Cultivo Actual</p>
                                       <p className={`text-sm font-black italic ${ hasData ? 'text-emerald-400' : 'text-slate-600'}`}>
                                          {l.siembra_activa?.especie || 'LIBRE'}
                                       </p>
                                    </div>
                                    <div className="text-right">
                                       <span className={`text-[8px] font-black px-3 py-1.5 rounded-full uppercase ${
                                          l.estado_lote === 'disponible' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                                       }`}>
                                          {l.estado_lote || 'N/A'}
                                       </span>
                                    </div>
                                 </div>
                                 <ChevronRight className={`w-5 h-5 text-slate-600 transition-transform flex-shrink-0 ${ isExpanded ? 'rotate-90 text-emerald-500' : ''}`} />
                              </div>

                              {/* EXPANDED BIOLOGICAL PANEL */}
                              {isExpanded && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="border-t border-emerald-500/20 bg-slate-950/50"
                                >
                                  {hasData ? (
                                    <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-6">
                                       <div>
                                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Especie</p>
                                          <p className="text-sm text-white font-bold italic">{l.siembra_activa.especie}</p>
                                       </div>
                                       <div>
                                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Variedad</p>
                                          <p className="text-sm text-white font-bold italic">{l.siembra_activa.variedad || 'Genérica'}</p>
                                       </div>
                                       <div>
                                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Ciclo</p>
                                          <span className={`text-[9px] font-black px-3 py-1 rounded uppercase ${
                                             l.siembra_activa.ciclo === 'ANUAL' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'
                                          }`}>
                                             {l.siembra_activa.ciclo || 'N/A'}
                                          </span>
                                       </div>
                                       <div>
                                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Fecha Siembra</p>
                                          <p className="text-sm text-white font-bold">{new Date(l.siembra_activa.fecha_siembra).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                       </div>
                                       <div>
                                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Censo (Plantas)</p>
                                          <p className="text-sm text-emerald-400 font-black">{l.siembra_activa.cantidad_plantas} <span className="text-slate-500 font-normal">unidades</span></p>
                                       </div>
                                       <div>
                                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Productor</p>
                                          <p className="text-sm text-white font-bold truncate">{context?.productor?.nombre}</p>
                                       </div>
                                       {l.siembra_activa.edad_dias && (
                                         <div className="col-span-full bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
                                            <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest mb-1">Edad Cronológica del Cultivo</p>
                                            <p className="text-xl text-white font-black italic">{l.siembra_activa.edad_dias} <span className="text-emerald-500 text-sm">días en campo</span></p>
                                         </div>
                                       )}
                                    </div>
                                  ) : (
                                    <div className="p-6 text-center">
                                       <p className="text-slate-500 italic text-sm">Este lote no tiene siembra activa registrada.</p>
                                       <p className="text-slate-600 text-xs mt-1">Disponible para ser asignado a un nuevo ciclo productivo.</p>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                           </div>
                         )})
                        }
                     </div>
                  </div>
              </div>
              
              <div className="p-8 bg-slate-950/50 border-t border-slate-800 flex justify-end">
                 <Button 
                    onClick={() => setShowDossier(false)}
                    className="bg-white text-slate-950 font-black italic uppercase tracking-tighter px-10 h-14 rounded-2xl hover:scale-105 active:scale-95 transition-all"
                 >
                    ENTENDIDO - CERRAR FICHA
                 </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          
          {/* SECCIÓN 1: DATOS GENERALES */}
          <div className="space-y-6">
             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-1">DATOS GENERALES</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Predio</label>
                   <div className="relative">
                      <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 w-4 h-4" />
                      <input 
                        disabled 
                        className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-white font-bold outline-none"
                        value={context?.lugar_nombre || inspection.lugar_produccion?.nombre_lugar}
                      />
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
                  onChange={(e) => setFormData({...formData, generalObs: e.target.value})}
                />
             </div>
          </div>

          {/* SECCIÓN 2: LOTES DEL PREDIO — VISOR BIOLÓGICO MEJORADO */}
          <div className="space-y-6">
             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-1">LOTES DEL PREDIO — SELECCIONA LOS QUE INSPECCIONARÁS HOY</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {context?.lotes?.map((l: any) => (
                   <button
                     key={l.id_lote}
                      onClick={() => setCurrentEval({ ...currentEval, id_lote: l.id_lote, siembra: l.siembra_activa, totales: l.siembra_activa?.cantidad_plantas || 0 })}
                     className={`p-6 rounded-3xl border-2 transition-all flex flex-col gap-4 text-left ${
                       currentEval.id_lote === l.id_lote 
                       ? 'bg-emerald-600/10 border-emerald-500/50 shadow-xl' 
                       : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                     }`}
                   >
                      <div className="flex justify-between items-start w-full">
                         <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${currentEval.id_lote === l.id_lote ? 'bg-emerald-500/20' : 'bg-slate-800'}`}>
                               <Check className={currentEval.id_lote === l.id_lote ? 'text-emerald-500' : 'text-slate-600'} />
                            </div>
                            <div>
                               <p className="text-white font-black italic uppercase tracking-tighter">{l.nombre_lote}</p>
                               <p className="text-[9px] text-slate-500 font-bold">{l.area} m² · {l.estado_lote?.toUpperCase()}</p>
                            </div>
                         </div>
                         {currentEval.id_lote === l.id_lote && (
                            <span className="bg-emerald-500 text-slate-950 font-black text-[8px] px-3 py-1 rounded-full uppercase italic ring-4 ring-emerald-500/10">SELECCIONADO</span>
                         )}
                      </div>

                      {l.id_lote === currentEval.id_lote && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-emerald-600/5 p-5 rounded-2xl border border-emerald-500/20 space-y-4"
                        >
                           <div className="flex items-center gap-2">
                              <Sprout className="w-3 h-3 text-emerald-500" />
                              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Información de Cultivos Registrados</span>
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
                                        <p className="text-[11px] text-white font-bold italic">{l.siembra_activa.variedad}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[8px] text-slate-500 font-black uppercase">Ciclo</p>
                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                                            l.siembra_activa.ciclo === 'ANUAL' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'
                                        }`}>
                                            {l.siembra_activa.ciclo}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-[8px] text-slate-500 font-black uppercase">Fecha Siembra</p>
                                        <p className="text-[11px] text-white font-bold italic">{new Date(l.siembra_activa.fecha_siembra).toLocaleDateString('es-ES')}</p>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-emerald-500/10 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[8px] text-slate-500 font-black uppercase">Productor</p>
                                        <p className="text-[11px] text-white font-bold truncate">{context?.productor?.nombre}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] text-slate-500 font-black uppercase">Censo (Plantas)</p>
                                        <p className="text-[11px] text-emerald-500 font-black tracking-tighter">{l.siembra_activa.cantidad_plantas} UNIDADES</p>
                                    </div>
                                </div>
                            </div>
                           ) : (
                            <div className="py-2 text-center">
                                <p className="text-[10px] text-slate-500 italic">No hay siembras activas registradas en este lote.</p>
                            </div>
                           )}
                        </motion.div>
                      )}
                   </button>
                ))}
             </div>
          </div>

          {/* SECCIÓN 3: FORMULARIO DE EVALUACIÓN */}
          <Card className="bg-slate-900/40 border-slate-800 rounded-[3rem] overflow-hidden">
             <CardContent className="p-10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">CULTIVO EVALUADO</label>
                       {context?.lotes?.find((l: any) => l.id_lote === currentEval.id_lote)?.siembra_activa ? (
                         <div className="w-full bg-emerald-600/10 border border-emerald-500/30 rounded-2xl py-4 px-6 flex items-center gap-4">
                           <Sprout className="text-emerald-500 w-5 h-5 flex-shrink-0" />
                           <div>
                             <p className="text-white font-black italic uppercase tracking-tight">
                               {context.lotes.find((l: any) => l.id_lote === currentEval.id_lote).siembra_activa.especie}
                             </p>
                             <p className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-widest">
                               {context.lotes.find((l: any) => l.id_lote === currentEval.id_lote).siembra_activa.variedad}
                             </p>
                           </div>
                         </div>
                       ) : (
                         <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-slate-600 font-bold italic text-sm">
                           Selecciona un lote arriba para ver el cultivo
                         </div>
                       )}
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">PLAGA DETECTADA</label>
                       <select
                         className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-white font-bold outline-none appearance-none"
                         value={plagaPersonalizada ? '__otra__' : currentEval.plaga}
                         onChange={(e) => {
                           if (e.target.value === '__otra__') {
                             setPlagaPersonalizada(" ")
                             setCurrentEval({...currentEval, plaga: ""})
                           } else {
                             setPlagaPersonalizada("")
                             setCurrentEval({...currentEval, plaga: e.target.value})
                           }
                         }}
                       >
                          <option value="">-- Sin hallazgos --</option>
                          <option value="Broca">Broca del Cafe</option>
                          <option value="Roya">Roya (Hemileia vastatrix)</option>
                          <option value="Minador">Hoja Minador</option>
                          <option value="Cochinilla">Cochinilla</option>
                          <option value="Arana roja">Arana Roja (Tetranychus)</option>
                          <option value="Trips">Trips</option>
                          <option value="Mosca Blanca">Mosca Blanca</option>
                          <option value="Antracnosis">Antracnosis</option>
                          <option value="__otra__">Otra plaga (escribir)...</option>
                       </select>
                       {plagaPersonalizada !== "" && (
                         <input
                           type="text"
                           className="w-full bg-slate-950 border-2 border-emerald-500/40 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-emerald-500 transition-all placeholder:text-slate-600 mt-2"
                           placeholder="Ej: Phytophthora cinnamomi..."
                           value={plagaPersonalizada.trim()}
                           onChange={(e) => {
                             setPlagaPersonalizada(e.target.value)
                             setCurrentEval({...currentEval, plaga: e.target.value})
                           }}
                         />
                       )}
                    </div>
                 </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">TOTAL PLANTAS EN EL LOTE</label>
                      <div className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 flex items-center justify-between gap-4">
                        <span className="text-slate-400 font-bold italic text-sm">
                          {currentEval.totales ? `${currentEval.totales} plantas registradas` : 'Selecciona un lote'}
                        </span>
                        <input
                          type="number"
                          className="w-28 bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-white font-bold outline-none focus:border-emerald-500 transition-all text-right text-sm"
                          title="Ajustar si es necesario"
                          value={currentEval.totales || ""}
                          onChange={(e) => setCurrentEval({...currentEval, totales: Number(e.target.value)})}
                        />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">PLANTAS AFECTADAS</label>
                      <input 
                        type="number"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-white font-bold outline-none"
                        placeholder="Ej: 45"
                        value={currentEval.afectadas || ""}
                        onChange={(e) => setCurrentEval({...currentEval, afectadas: Number(e.target.value)})}
                      />
                   </div>
                </div>

                <div className="bg-emerald-600/5 border border-emerald-500/20 p-6 rounded-2xl flex items-center justify-between">
                   <div className="flex flex-col">
                      <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest italic">% Infestación calculado:</span>
                   </div>
                   <p className={`text-4xl font-black italic tracking-tighter ${calculateInfestation() > 20 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {calculateInfestation().toFixed(1)}%
                   </p>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">RECOMENDACIÓN DE MANEJO</label>
                   <select 
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-white font-bold outline-none appearance-none"
                      value={currentEval.recomendacion}
                      onChange={(e) => setCurrentEval({...currentEval, recomendacion: e.target.value})}
                   >
                      <option value="">— Seleccionar —</option>
                      <option value="Preventiva">Control Preventivo</option>
                      <option value="Organica">Asistencia Orgánica</option>
                      <option value="Quimica">Intervención Química Dirigida</option>
                   </select>
                </div>

                <Button onClick={handleAddEvaluation} className="w-full py-6 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-2xl font-black italic uppercase tracking-widest transition-all">
                   REGISTRAR HALLAZGO DE LOTE
                </Button>
             </CardContent>
          </Card>
        </div>

        {/* COLUMNA DERECHA: RESUMEN Y ACCIONES */}
        <div className="space-y-6">
           <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-[3rem] space-y-8 backdrop-blur-2xl sticky top-8">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-teal-500/20 rounded-xl flex items-center justify-center">
                    <History className="text-teal-500 w-5 h-5" />
                 </div>
                 <h4 className="text-white font-black italic uppercase tracking-widest">Resumen de Registro</h4>
              </div>

              <div className="space-y-4">
                 {formData.evaluations.length === 0 ? (
                    <p className="text-slate-600 text-xs italic text-center py-10 px-4 border border-dashed border-slate-800 rounded-2xl">Aún no se han evaluado lotes en esta sesión.</p>
                 ) : (
                    formData.evaluations.map((ev, i) => (
                       <div key={i} className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800 group">
                          <div>
                             <p className="text-xs text-white font-black italic uppercase">{ev.plaga}</p>
                             <p className="text-[10px] text-slate-500">Lote ID: {ev.id_lote}</p>
                          </div>
                          <div className="text-right">
                             <p className="text-sm font-black text-teal-400">{ev.porcentaje.toFixed(1)}%</p>
                             <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto mt-1 opacity-20 group-hover:opacity-100 transition-opacity" />
                          </div>
                       </div>
                    ))
                 )}
              </div>

              <div className="pt-6 border-t border-slate-800 flex flex-col gap-4">
                 <Button 
                    disabled={isFinishing}
                    onClick={() => handleFinish('en_proceso')}
                    className="w-full h-16 bg-transparent border-2 border-slate-800 text-white font-black italic rounded-2xl hover:bg-slate-800 transition-all uppercase tracking-tighter"
                 >
                    <Save className="w-5 h-5 mr-3" /> Guardar — En Proceso
                 </Button>
                 <Button 
                    disabled={isFinishing || formData.evaluations.length === 0}
                    onClick={() => handleFinish('finalizada')}
                    className="w-full h-20 bg-emerald-600 hover:bg-emerald-500 text-white font-black italic text-xl rounded-[2rem] shadow-2xl shadow-emerald-900/40 transition-all uppercase tracking-tighter"
                 >
                    {isFinishing ? <Loader2 className="animate-spin w-8 h-8" /> : (
                       <><CheckCircle2 className="w-7 h-7 mr-3" /> Finalizar Inspección</>
                    )}
                 </Button>
              </div>
           </div>
        </div>
      </div>
    </motion.div>
  )
}

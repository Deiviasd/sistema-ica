"use client"
// Force rebuild

import { useEffect, useState, useMemo, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Calendar,
  MapPin,
  Clock,
  ClipboardCheck,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  ArrowRight,
  ShieldCheck,
  Trash2
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { useUserStore } from "@/lib/store"

interface LugarProduccion {
  id_lugar_produccion: number
  nombre_lugar: string
  region?: any
  predio?: {
    id_predio: number
    nombre_predio: string
    region?: any
  }[]
}

function AgendarForm() {
  const { user, selectedPredioId } = useUserStore()
  const searchParams = useSearchParams()
  const preSelectedLugarId = searchParams.get('id_lugar_produccion')
  const preSelectedPredioId = searchParams.get('id_predio') || selectedPredioId

  const [lugares, setLugares] = useState<LugarProduccion[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [assignedTech, setAssignedTech] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const router = useRouter()

  // 🛡️ Protección de Ruta por Roles
  useEffect(() => {
    if (user && user.role !== "productor") {
      router.push("/dashboard")
    }
  }, [user, router])

  const getMinDateString = () => {
    const date = new Date()
    date.setDate(date.getDate() + 3)
    return date.toISOString().split('T')[0]
  }

  const [formData, setFormData] = useState({
    id_lugar_produccion: preSelectedLugarId || "",
    fecha: "",
    hora: "08:00"
  })

  // 📝 Estados para el monitoreo
  const [inspecciones, setInspecciones] = useState<any[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [archivedIds, setArchivedIds] = useState<number[]>(() => {
    if (typeof window !== "undefined") {
      try {
        return JSON.parse(localStorage.getItem("archived_inspecciones") || "[]")
      } catch {
        return []
      }
    }
    return []
  })

  const hasActive = inspecciones.some(ins =>
    ins.id_lugar_produccion?.toString() === formData.id_lugar_produccion.toString() &&
    (ins.estado === 'programada' || ins.estado === 'en_proceso')
  );

  const selectedLugar = useMemo(() => {
    return lugares.find(l => l.id_lugar_produccion.toString() === formData.id_lugar_produccion.toString())
  }, [lugares, formData.id_lugar_produccion]);

  useEffect(() => {
    api.get("/predios/lugares-produccion")
      .then(res => {
        setLugares(res.data)
        if (res.data.length > 0) {
          let defaultLugarId = preSelectedLugarId || res.data[0].id_lugar_produccion.toString();

          setFormData(prev => ({
            ...prev,
            id_lugar_produccion: defaultLugarId
          }))
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [preSelectedLugarId])

  // 📡 Cargar historial para monitoreo
  useEffect(() => {
    api.get("/inspecciones/reporte")
      .then(res => setInspecciones(res.data))
      .catch(err => console.error("Error cargando monitoreo:", err))
  }, [refreshKey])

  const filteredInspecciones = useMemo(() => {
    return inspecciones.filter(ins => {
      const matchLugar = formData.id_lugar_produccion ? ins.id_lugar_produccion?.toString() === formData.id_lugar_produccion.toString() : true;
      const isArchived = archivedIds.includes(ins.id_inspeccion);
      return matchLugar && !isArchived;
    });
  }, [inspecciones, formData.id_lugar_produccion, archivedIds]);

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.id_lugar_produccion || !formData.fecha || !formData.hora) {
      setError("Por favor, complete todos los campos")
      return
    }
    setShowConfirmModal(true)
  }

  const confirmSubmit = async () => {
    setError(null)
    setIsSubmitting(true)
    setShowConfirmModal(false)

    try {
      const res = await api.post("/inspecciones/agendar", formData)
      setAssignedTech(res.data.tecnico_asignado)
      setRefreshKey(prev => prev + 1) // 🔄 Refrescar lista
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al procesar la solicitud")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelar = async (id: number) => {
    if (!confirm("¿Está seguro de que desea cancelar esta inspección?")) return
    try {
      await api.patch(`/inspecciones/${id}/cancelar`)
      setRefreshKey(prev => prev + 1) // 🔄 Refrescar lista
    } catch (err: any) {
      alert(err.response?.data?.error || "Error al cancelar")
    }
  }

  const handleArchivar = (id: number) => {
    if (!confirm("¿Deseas ocultar esta inspección finalizada de tu vista? Los registros se conservarán en la base de datos para auditorías del ICA.")) return
    const updated = [...archivedIds, id]
    setArchivedIds(updated)
    localStorage.setItem("archived_inspecciones", JSON.stringify(updated))
  }

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-12 h-12 text-teal-500 animate-spin" /></div>

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 font-sans" style={{ fontFamily: 'Outfit, sans-serif' }}>

      <div className="flex flex-col gap-2 border-b-2 border-border pb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-500/10 rounded-2xl flex items-center justify-center">
            <Calendar className="text-teal-500 w-7 h-7" />
          </div>
          <h1 className="text-4xl font-black text-foreground italic tracking-tighter uppercase">Agendar Inspección Técnico-Sanitaria</h1>
        </div>
        <p className="text-muted-foreground font-bold text-xs uppercase tracking-[0.3em] ml-16">Sistema de Asignación Automática • Protocolo ICA</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

        <div className="md:col-span-2">
          <form onSubmit={handleInitialSubmit} className="space-y-8">
            <Card className="bg-card/40 border-border rounded-[2.5rem] overflow-hidden backdrop-blur-xl">
              <CardContent className="p-10 space-y-10">

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-teal-500 text-slate-950 font-black rounded-lg flex items-center justify-center text-xs italic">01</span>
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest italic">Lugar de Producción</label>
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500 w-5 h-5 pointer-events-none" />
                    <div className="w-full bg-background border-2 border-border rounded-2xl py-5 pl-12 pr-4 text-teal-400 font-black text-lg italic flex items-center">
                      {lugares.find(l => l.id_lugar_produccion.toString() === formData.id_lugar_produccion)?.nombre_lugar || 'Cargando lugar...'}
                    </div>
                  </div>
                </div>

                {hasActive && (
                  <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-sm font-bold animate-pulse">
                    Este lugar de producción ya tiene una inspección activa programada o en curso. Podrás solicitar una nueva cuando el técnico finalice la actual.
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-teal-500 text-slate-950 font-black rounded-lg flex items-center justify-center text-xs italic">02</span>
                      <label className="text-xs font-black text-muted-foreground uppercase tracking-widest italic">Fecha de Visita</label>
                    </div>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500 w-5 h-5 pointer-events-none" />
                      <input
                        required
                        type="date"
                        min={getMinDateString()}
                        className="w-full bg-background border-2 border-border rounded-2xl py-5 pl-12 pr-4 text-foreground font-bold outline-none focus:border-teal-500 transition-all"
                        value={formData.fecha}
                        onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-teal-500 text-slate-950 font-black rounded-lg flex items-center justify-center text-xs italic">03</span>
                      <label className="text-xs font-black text-muted-foreground uppercase tracking-widest italic">Bloque Horario</label>
                    </div>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500 w-5 h-5 pointer-events-none" />
                      <select
                        className="w-full bg-background border-2 border-border rounded-2xl py-5 pl-12 pr-4 text-foreground font-bold outline-none focus:border-teal-500 transition-all appearance-none"
                        value={formData.hora}
                        onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                      >
                        <option value="06:00">06:00 AM</option>
                        <option value="08:00">08:00 AM</option>
                        <option value="10:00">10:00 AM</option>
                        <option value="12:00">12:00 PM</option>
                      </select>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

            <Button
              disabled={isSubmitting || hasActive}
              className={`w-full h-20 text-foreground font-black text-xl rounded-3xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 ${hasActive ? 'bg-rose-600/50 cursor-not-allowed border-rose-500/20 shadow-rose-900/10' : 'bg-teal-600 hover:bg-teal-500 shadow-teal-900/40'}`}
            >
              {isSubmitting ? <Loader2 className="animate-spin w-8 h-8" /> : hasActive ? (
                <> LUGAR CON INSPECCIÓN ACTIVA </>
              ) : (
                <> SOLICITAR ASIGNACIÓN TÉCNICA <ArrowRight className="w-7 h-7" /> </>
              )}
            </Button>

            {error && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-6 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <p className="font-bold text-sm">{error}</p>
              </motion.div>
            )}
          </form>
        </div>

        <div className="space-y-6">
          <Card className="bg-card/20 border-border border-dashed rounded-[2rem] p-8 text-center">
            <ShieldCheck className="w-12 h-12 text-teal-500 opacity-20 mx-auto mb-4" />
            <h3 className="text-foreground font-black italic uppercase tracking-tighter mb-2">Protocolo de Asignación</h3>
            <p className="text-muted-foreground text-xs font-medium leading-relaxed">
              El sistema detectará automáticamente al inspector con menor carga de trabajo para garantizar una respuesta rápida en terreno.
            </p>
          </Card>

          <div className="p-6 bg-teal-500/5 rounded-3xl border border-teal-500/10">
            <div className="flex items-center gap-3 mb-4">
              <ClipboardCheck className="text-teal-500 w-5 h-5" />
              <span className="text-[10px] font-black text-teal-500 uppercase tracking-widest">Requisitos</span>
            </div>
            <ul className="space-y-3">
              {['Tener registro de predio activo', 'Contar con siembra reportada', 'Persona responsable en el sitio'].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground font-bold italic">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>

      {/* 📊 SECCIÓN DE MONITOREO DE ESTADOS */}
      <div className="space-y-8 pt-10 border-t-2 border-border">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-teal-500/10 rounded-xl flex items-center justify-center">
            <ClipboardCheck className="text-teal-500 w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-foreground italic tracking-tighter uppercase">Estado de mis Inspecciones</h2>
            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Monitoreo en tiempo real • Protocolo de cumplimiento</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredInspecciones.length === 0 ? (
              <div className="col-span-full p-12 bg-card/20 border-2 border-dashed border-border rounded-[2.5rem] text-center">
                <p className="text-muted-foreground font-bold italic">No tienes inspecciones programadas actualmente para este lugar de producción.</p>
              </div>
            ) : (
              filteredInspecciones.map((ins) => (
                <motion.div
                  key={ins.id_inspeccion}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Card className={`bg-card/40 border-border rounded-[2rem] overflow-hidden backdrop-blur-xl relative transition-all hover:border-teal-500/50 ${ins.estado === 'cancelada' ? 'opacity-60 grayscale' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-6">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Estado Actual</p>
                          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase italic ${ins.estado === 'programada' ? 'bg-blue-500/10 text-blue-500' :
                            ins.estado === 'en_proceso' ? 'bg-amber-500/10 text-amber-500' :
                              ins.estado === 'finalizada' ? 'bg-emerald-500/10 text-emerald-500' :
                                'bg-slate-500/10 text-muted-foreground'
                            }`}>
                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${ins.estado === 'programada' ? 'bg-blue-500' :
                              ins.estado === 'en_proceso' ? 'bg-amber-500' :
                                ins.estado === 'finalizada' ? 'bg-emerald-500' :
                                  'bg-slate-500'
                              }`} />
                            {ins.estado.replace('_', ' ')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {ins.estado === 'programada' && (
                            <Button
                              variant="ghost"
                              onClick={() => handleCancelar(ins.id_inspeccion)}
                              className="h-8 text-[10px] font-black text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg uppercase tracking-tighter"
                            >
                              Cancelar Cita
                            </Button>
                          )}
                          {(ins.estado === 'finalizada' || ins.estado === 'cancelada') && (
                            <Button
                              variant="ghost"
                              onClick={() => handleArchivar(ins.id_inspeccion)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg flex items-center justify-center transition-colors"
                              title="Archivar de la vista"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-teal-500" />
                          <span className="text-sm font-bold text-foreground">{new Date(ins.fecha_programada).toLocaleDateString()}</span>
                          <Clock className="w-4 h-4 text-teal-500 ml-2" />
                          <span className="text-sm font-bold text-foreground">{new Date(ins.fecha_programada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div className="p-4 bg-background rounded-2xl border border-border">
                          <p className="text-[8px] font-black text-muted-foreground/70 uppercase tracking-widest mb-1">Técnico Asignado</p>
                          <p className="text-xs font-black text-teal-400 uppercase italic">{ins.tecnico_nombre || 'Por asignar'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {assignedTech && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/95 backdrop-blur-xl" onClick={() => setAssignedTech(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-lg bg-card border border-border rounded-[3rem] p-12 text-center shadow-4xl z-10">
              <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-emerald-500/20 ring-8 ring-emerald-500/5">
                <UserCheck className="text-emerald-500 w-12 h-12" />
              </div>
              <h2 className="text-3xl font-black text-foreground italic tracking-tighter uppercase mb-4">Solicitud Registrada</h2>
              <p className="text-muted-foreground font-medium mb-10 leading-relaxed px-6">
                Tu inspección ha sido programada exitosamente bajo el protocolo de cumplimiento.
                <br />
                <span className="text-teal-500 font-black italic">Técnico Asignado:</span>
              </p>

              <div className="bg-background p-8 rounded-3xl border border-border mb-10 group transition-all">
                <p className="text-xs text-muted-foreground font-black uppercase tracking-[0.3em] mb-2">Inspector Encargado</p>
                <p className="text-2xl font-black text-teal-400 uppercase italic tracking-tighter group-hover:scale-105 transition-transform">{assignedTech}</p>
              </div>

              <Button onClick={() => setAssignedTech(null)} className="w-full h-16 bg-white text-slate-950 font-black text-lg rounded-2xl hover:bg-slate-200 transition-all">
                ENTENDIDO
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Advertencia Antes de Agendar */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setShowConfirmModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-card border border-border rounded-[2.5rem] p-8 shadow-2xl z-10"
            >
              <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-amber-500" />
              </div>
              <h3 className="text-2xl font-black text-center mb-4">
                Atención: Inspección de Lugar de Producción
              </h3>
              <p className="text-muted-foreground text-center mb-6 leading-relaxed">
                Al solicitar esta asignación técnica, el funcionario ICA evaluará
                <span className="text-amber-500 font-bold"> todo el Lugar de Producción</span>.
              </p>

              {selectedLugar && selectedLugar.predio && selectedLugar.predio.length > 0 && (
                <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 mb-8 text-left max-h-48 overflow-y-auto custom-scrollbar">
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-400 mb-3">Predios que serán inspeccionados:</p>
                  <ul className="space-y-3">
                    {selectedLugar.predio.map(p => {
                      const lpRegion = selectedLugar.region;
                      const isSame = !p.region || !lpRegion || (p.region.municipio === lpRegion.municipio && p.region.vereda === lpRegion.vereda && p.region.direccion === lpRegion.direccion);
                      return (
                        <li key={p.id_predio} className="flex flex-col text-sm border-l-2 border-slate-700 pl-3">
                          <span className="font-bold text-foreground flex items-center gap-2">
                            {p.nombre_predio}
                            {!isSame && <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[9px] rounded-full uppercase font-black">Distinta Ubicación</span>}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {p.region ? `${p.region.municipio}, ${p.region.vereda} - ${p.region.direccion}` : 'Ubicación no especificada'}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {selectedLugar.predio.some(p => {
                    const lpRegion = selectedLugar.region;
                    return p.region && lpRegion && (p.region.municipio !== lpRegion.municipio || p.region.vereda !== lpRegion.vereda || p.region.direccion !== lpRegion.direccion);
                  }) && (
                      <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-xs font-bold flex gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <div>
                          Algunos predios están en ubicaciones diferentes. El técnico podría requerir realizar múltiples visitas o coordinar traslados.
                        </div>
                      </div>
                    )}
                </div>
              )}

              <div className="space-y-3">
                <Button
                  className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-foreground font-black text-lg rounded-2xl transition-all active:scale-95"
                  onClick={() => confirmSubmit()}
                >
                  CONFIRMAR AGENDAMIENTO
                </Button>
                <Button
                  variant="ghost"
                  className="w-full h-14 text-muted-foreground hover:bg-muted rounded-2xl font-bold transition-all"
                  onClick={() => setShowConfirmModal(false)}
                >
                  VOLVER A REVISAR
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}

export default function AgendarInspeccionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-12 h-12 text-teal-500 animate-spin" /></div>}>
      <AgendarForm />
    </Suspense>
  )
}

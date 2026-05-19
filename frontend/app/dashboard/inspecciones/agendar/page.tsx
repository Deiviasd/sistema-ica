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
  predio?: {
    id_predio: number
    nombre_predio: string
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
    id_predio: preSelectedPredioId || "",
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
    ins.id_predio?.toString() === formData.id_predio.toString() &&
    (ins.estado === 'programada' || ins.estado === 'en_proceso')
  );

  useEffect(() => {
    api.get("/predios/lugares-produccion")
      .then(res => {
        setLugares(res.data)
        if (res.data.length > 0) {
          let defaultLugarId = "";
          let defaultPredioId = "";
          
          if (preSelectedPredioId) {
            const lugarConPredio = res.data.find((l: any) => 
              l.predio?.some((p: any) => p.id_predio.toString() === preSelectedPredioId.toString())
            );
            if (lugarConPredio) {
              defaultLugarId = lugarConPredio.id_lugar_produccion.toString();
              defaultPredioId = preSelectedPredioId;
            }
          }
          
          if (!defaultLugarId && preSelectedLugarId) {
            defaultLugarId = preSelectedLugarId;
            const lugar = res.data.find((l: any) => l.id_lugar_produccion.toString() === preSelectedLugarId.toString());
            if (lugar && lugar.predio && lugar.predio.length > 0) {
              defaultPredioId = lugar.predio[0].id_predio.toString();
            }
          }
          
          if (!defaultLugarId) {
            defaultLugarId = res.data[0].id_lugar_produccion.toString();
            if (res.data[0].predio && res.data[0].predio.length > 0) {
              defaultPredioId = res.data[0].predio[0].id_predio.toString();
            }
          }
          
          setFormData(prev => ({ 
            ...prev, 
            id_lugar_produccion: defaultLugarId,
            id_predio: defaultPredioId
          }))
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [preSelectedLugarId, preSelectedPredioId])

  // 📡 Cargar historial para monitoreo
  useEffect(() => {
    api.get("/inspecciones/reporte")
      .then(res => setInspecciones(res.data))
      .catch(err => console.error("Error cargando monitoreo:", err))
  }, [refreshKey])

  const filteredInspecciones = useMemo(() => {
    return inspecciones.filter(ins => {
      const matchPredio = formData.id_predio ? ins.id_predio?.toString() === formData.id_predio.toString() : true;
      const isArchived = archivedIds.includes(ins.id_inspeccion);
      return matchPredio && !isArchived;
    });
  }, [inspecciones, formData.id_predio, archivedIds]);

  const allPredios = useMemo(() => {
    const list: { id_predio: number; nombre_predio: string; id_lugar_produccion: number; nombre_lugar: string }[] = [];
    lugares.forEach(lugar => {
      lugar.predio?.forEach(predio => {
        list.push({
          id_predio: predio.id_predio,
          nombre_predio: predio.nombre_predio,
          id_lugar_produccion: lugar.id_lugar_produccion,
          nombre_lugar: lugar.nombre_lugar
        });
      });
    });
    return list;
  }, [lugares]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

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

      <div className="flex flex-col gap-2 border-b-2 border-slate-800 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-500/10 rounded-2xl flex items-center justify-center">
            <Calendar className="text-teal-500 w-7 h-7" />
          </div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Agendar Inspección Técnico-Sanitaria</h1>
        </div>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.3em] ml-16">Sistema de Asignación Automática • Protocolo ICA</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-8">
            <Card className="bg-slate-900/40 border-slate-800 rounded-[2.5rem] overflow-hidden backdrop-blur-xl">
              <CardContent className="p-10 space-y-10">

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-teal-500 text-slate-950 font-black rounded-lg flex items-center justify-center text-xs italic">01</span>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest italic">Predio Autorizado</label>
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500 w-5 h-5 pointer-events-none" />
                    <select
                      required
                      className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl py-5 pl-12 pr-12 text-teal-400 font-black text-lg italic outline-none focus:border-teal-500 transition-all appearance-none cursor-pointer"
                      value={formData.id_predio}
                      onChange={(e) => {
                        const predioId = e.target.value;
                        const match = allPredios.find(p => p.id_predio.toString() === predioId.toString());
                        if (match) {
                          setFormData({
                            ...formData,
                            id_predio: predioId,
                            id_lugar_produccion: match.id_lugar_produccion.toString()
                          });
                        }
                      }}
                    >
                      <option value="" disabled className="bg-slate-900 text-slate-500 font-bold text-sm">Selecciona un predio...</option>
                      {allPredios.map(p => (
                        <option key={p.id_predio} value={p.id_predio.toString()} className="bg-slate-900 text-white font-bold text-sm">
                          {p.nombre_predio} ({p.nombre_lugar})
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-teal-500 flex items-center">
                      <ChevronRight className="w-6 h-6 rotate-90" />
                    </div>
                  </div>
                </div>

                {hasActive && (
                  <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-sm font-bold animate-pulse">
                    🔒 Este predio ya tiene una inspección activa programada o en curso. Podrás solicitar una nueva cuando el técnico finalice la actual.
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-teal-500 text-slate-950 font-black rounded-lg flex items-center justify-center text-xs italic">02</span>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest italic">Fecha de Visita</label>
                    </div>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500 w-5 h-5 pointer-events-none" />
                      <input
                        required
                        type="date"
                        min={getMinDateString()}
                        className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl py-5 pl-12 pr-4 text-white font-bold outline-none focus:border-teal-500 transition-all"
                        value={formData.fecha}
                        onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-teal-500 text-slate-950 font-black rounded-lg flex items-center justify-center text-xs italic">03</span>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest italic">Bloque Horario</label>
                    </div>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500 w-5 h-5 pointer-events-none" />
                      <select
                        className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl py-5 pl-12 pr-4 text-white font-bold outline-none focus:border-teal-500 transition-all appearance-none"
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
              className={`w-full h-20 text-white font-black text-xl rounded-3xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 ${hasActive ? 'bg-rose-600/50 cursor-not-allowed border-rose-500/20 shadow-rose-900/10' : 'bg-teal-600 hover:bg-teal-500 shadow-teal-900/40'}`}
            >
              {isSubmitting ? <Loader2 className="animate-spin w-8 h-8" /> : hasActive ? (
                <> PREDIO CON INSPECCIÓN ACTIVA </>
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
          <Card className="bg-slate-900/20 border-slate-800 border-dashed rounded-[2rem] p-8 text-center">
            <ShieldCheck className="w-12 h-12 text-teal-500 opacity-20 mx-auto mb-4" />
            <h3 className="text-white font-black italic uppercase tracking-tighter mb-2">Protocolo de Asignación</h3>
            <p className="text-slate-500 text-xs font-medium leading-relaxed">
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
                <li key={i} className="flex items-center gap-2 text-xs text-slate-400 font-bold italic">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>

      {/* 📊 SECCIÓN DE MONITOREO DE ESTADOS */}
      <div className="space-y-8 pt-10 border-t-2 border-slate-900">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-teal-500/10 rounded-xl flex items-center justify-center">
            <ClipboardCheck className="text-teal-500 w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Estado de mis Inspecciones</h2>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Monitoreo en tiempo real • Protocolo de cumplimiento</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredInspecciones.length === 0 ? (
              <div className="col-span-full p-12 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[2.5rem] text-center">
                <p className="text-slate-500 font-bold italic">No tienes inspecciones programadas actualmente para este predio.</p>
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
                    <Card className={`bg-slate-900/40 border-slate-800 rounded-[2rem] overflow-hidden backdrop-blur-xl relative transition-all hover:border-teal-500/50 ${ins.estado === 'cancelada' ? 'opacity-60 grayscale' : ''}`}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-6">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado Actual</p>
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase italic ${ins.estado === 'programada' ? 'bg-blue-500/10 text-blue-500' :
                              ins.estado === 'en_proceso' ? 'bg-amber-500/10 text-amber-500' :
                                ins.estado === 'finalizada' ? 'bg-emerald-500/10 text-emerald-500' :
                                  'bg-slate-500/10 text-slate-400'
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
                                className="h-8 w-8 p-0 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg flex items-center justify-center transition-colors"
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
                            <span className="text-sm font-bold text-white">{new Date(ins.fecha_programada).toLocaleDateString()}</span>
                            <Clock className="w-4 h-4 text-teal-500 ml-2" />
                            <span className="text-sm font-bold text-white">{new Date(ins.fecha_programada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Técnico Asignado</p>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl" onClick={() => setAssignedTech(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[3rem] p-12 text-center shadow-4xl">
              <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-emerald-500/20 ring-8 ring-emerald-500/5">
                <UserCheck className="text-emerald-500 w-12 h-12" />
              </div>
              <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-4">Solicitud Registrada</h2>
              <p className="text-slate-400 font-medium mb-10 leading-relaxed px-6">
                Tu inspección ha sido programada exitosamente bajo el protocolo de cumplimiento.
                <br />
                <span className="text-teal-500 font-black italic">Técnico Asignado:</span>
              </p>

              <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 mb-10 group transition-all">
                <p className="text-xs text-slate-500 font-black uppercase tracking-[0.3em] mb-2">Inspector Encargado</p>
                <p className="text-2xl font-black text-teal-400 uppercase italic tracking-tighter group-hover:scale-105 transition-transform">{assignedTech}</p>
              </div>

              <Button onClick={() => setAssignedTech(null)} className="w-full h-16 bg-white text-slate-950 font-black text-lg rounded-2xl hover:bg-slate-200 transition-all">
                ENTENDIDO
              </Button>
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

"use client"
// Force rebuild

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
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
  ShieldCheck
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { useUserStore } from "@/lib/store"

interface LugarProduccion {
  id_lugar_produccion: number
  nombre_lugar: string
}

function AgendarForm() {
  const { user } = useUserStore()
  const searchParams = useSearchParams()
  const preSelectedId = searchParams.get('id_lugar_produccion')

  const [lugares, setLugares] = useState<LugarProduccion[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [assignedTech, setAssignedTech] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    id_lugar_produccion: preSelectedId || "",
    fecha: "",
    hora: "08:00"
  })

  useEffect(() => {
    api.get("/predios/lugares-produccion")
      .then(res => {
        setLugares(res.data)
        // Selección automática: Si hay predios, elegimos el primero por defecto
        if (res.data.length > 0) {
          const defaultId = preSelectedId || res.data[0].id_lugar_produccion.toString()
          setFormData(prev => ({ ...prev, id_lugar_produccion: defaultId }))
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [preSelectedId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const res = await api.post("/inspecciones/agendar", formData)
      setAssignedTech(res.data.tecnico_asignado)
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al procesar la solicitud")
    } finally {
      setIsSubmitting(false)
    }
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
                    <div className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl py-5 pl-12 pr-4 flex flex-col shadow-inner">
                      <span className="text-teal-400 font-black text-lg italic">
                        {user?.nombre_predio || lugares.find(l => l.id_lugar_produccion.toString() === formData.id_lugar_produccion.toString())?.nombre_lugar || "No hay predio registrado"}
                      </span>
                    </div>
                    <input type="hidden" name="id_lugar_produccion" value={formData.id_lugar_produccion} />
                  </div>
                </div>

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
                        min={new Date().toISOString().split('T')[0]}
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
                        <option value="08:00">08:00 AM</option>
                        <option value="10:00">10:00 AM</option>
                        <option value="12:00">12:00 PM</option>
                        <option value="14:00">02:00 PM</option>
                        <option value="16:00">04:00 PM</option>
                      </select>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

            <Button
              disabled={isSubmitting}
              className="w-full h-20 bg-teal-600 hover:bg-teal-500 text-white font-black text-xl rounded-3xl shadow-2xl shadow-teal-900/40 active:scale-95 transition-all flex items-center justify-center gap-4"
            >
              {isSubmitting ? <Loader2 className="animate-spin w-8 h-8" /> : (
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

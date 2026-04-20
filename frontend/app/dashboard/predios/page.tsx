"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Plus, 
  MapPin, 
  Maximize2, 
  Navigation, 
  CheckCircle2, 
  X, 
  Loader2,
  MoreVertical,
  Trash2,
  Edit2,
  TreePine,
  ClipboardCheck
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { useUserStore } from "@/lib/store"

interface LugarProduccion {
  id_lugar_produccion: number
  nombre_lugar: string
  area_total: number
  numero_predial: string
  created_at?: string
}

export default function PrediosPage() {
  const { user } = useUserStore()
  const [lugares, setLugares] = useState<LugarProduccion[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Formulario siguiendo secuencia base
  const [formData, setFormData] = useState({
    predio: "",
    nombre: "",
    area: ""
  })

  useEffect(() => {
    fetchLugares()
  }, [])

  const fetchLugares = async () => {
    try {
      const res = await api.get("/predios/lugares-produccion")
      setLugares(res.data)
    } catch (error) {
      console.error("Error cargando lugares:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Paso 6: Validación de campos obligatorios
    if (!formData.predio || !formData.nombre || !formData.area) {
      alert("Por favor completa todos los campos obligatorios.")
      return
    }

    setIsSaving(true)
    try {
      // Paso 7: Registro y asociación
      await api.post("/predios/lugares-produccion", {
        nombre_lugar: formData.nombre,
        area_total_m2: Number(formData.area),
        numero_predial: formData.predio
      })

      // Paso 8: Confirmación de éxito
      setShowModal(false)
      setFormData({ predio: "", nombre: "", area: "" })
      await fetchLugares()
      alert("✅ Lugar de producción registrado con éxito.")
    } catch (error: any) {
      alert(error.response?.data?.error || "Error al registrar el lugar")
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
    </div>
  )

  return (
    <div className="space-y-8 pb-20">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <Navigation className="text-emerald-500 w-10 h-10" />
            Lugares de Producción
          </h1>
          <p className="text-slate-400 mt-2 text-lg">Administre sus áreas destinadas al cultivo y control fitosanitario.</p>
        </div>
        
        {/* Paso 2: Opción Registrar Lugar */}
        <Button 
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-14 px-8 rounded-2xl shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5 mr-2" /> Registrar Lugar de Producción
        </Button>
      </div>

      {/* Grid de Lugares */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lugares.length > 0 ? lugares.map((lugar) => (
          <motion.div
            key={lugar.id_lugar_produccion}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onDoubleClick={() => window.location.href = `/dashboard/inspecciones/agendar?id_lugar_produccion=${lugar.id_lugar_produccion}`}
            className="cursor-pointer"
          >
            <Card className="bg-slate-900/50 border-slate-800 hover:border-emerald-500/50 transition-all group overflow-hidden h-full relative">
              <CardContent className="p-0">
                {/* Visual Accent */}
                <div className="h-2 bg-emerald-500/20 group-hover:bg-emerald-500 transition-colors" />
                
                <div className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center">
                      <TreePine className="text-emerald-400 w-8 h-8" />
                    </div>
                    <button className="text-slate-500 hover:text-white">
                      <MoreVertical className="w-6 h-6" />
                    </button>
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-2">{lugar.nombre_lugar}</h3>
                  <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-3 text-slate-400">
                      <MapPin className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm">Predio: <span className="text-slate-200 font-medium">{lugar.numero_predial}</span></span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400">
                      <Maximize2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm">Área: <span className="text-slate-200 font-medium">{lugar.area_total} m²</span></span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button 
                      onClick={() => window.location.href = `/dashboard/inspecciones/agendar?id_lugar_produccion=${lugar.id_lugar_produccion}`}
                      className="w-full bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-slate-700 transition-all font-bold group/btn"
                    >
                      <ClipboardCheck className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform" /> 
                      Agendar Inspección
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="w-full border-slate-800 hover:bg-slate-800 text-slate-400">
                        <Edit2 className="w-4 h-4 mr-2" /> Editar
                      </Button>
                      <Button variant="outline" size="sm" className="w-full border-slate-800 hover:bg-rose-500/10 hover:text-rose-500 text-slate-400">
                        <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )) : (
          <div className="col-span-full py-20 text-center bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem]">
            <MapPin className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 text-xl font-medium">No tiene lugares registrados aún.</p>
            <p className="text-slate-600">Haga clic en el botón superior para comenzar.</p>
          </div>
        )}
      </div>

      {/* Paso 3: Modal de Registro */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              onClick={() => !isSaving && setShowModal(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 lg:p-10">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-black text-white">Nuevo Registro</h2>
                  <button 
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-slate-800 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-slate-500" />
                  </button>
                </div>

                {/* Paso 4: Formulario */}
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">Identificación del Predio</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                      <input 
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-emerald-500 outline-none transition-all text-lg"
                        placeholder="Ej: PR-2024-001"
                        value={formData.predio}
                        onChange={(e) => setFormData({...formData, predio: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre del Lugar</label>
                    <div className="relative">
                      <TreePine className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                      <input 
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-emerald-500 outline-none transition-all text-lg"
                        placeholder="Ej: Lote San Jerónimo"
                        value={formData.nombre}
                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">Área Total (m²)</label>
                    <div className="relative">
                      <Maximize2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                      <input 
                        required
                        type="number"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-emerald-500 outline-none transition-all text-lg"
                        placeholder="Ej: 5000"
                        value={formData.area}
                        onChange={(e) => setFormData({...formData, area: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Paso 5: Confirmar y Guardar */}
                  <Button 
                    disabled={isSaving}
                    className="w-full h-16 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xl rounded-2xl shadow-xl shadow-emerald-900/20 active:scale-95 transition-all mt-8"
                  >
                    {isSaving ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-6 h-6 mr-3" /> GUARDAR REGISTRO
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

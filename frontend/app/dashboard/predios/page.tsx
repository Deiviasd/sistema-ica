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
  TreePine,
  GripVertical
} from "lucide-react"
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { useUserStore } from "@/lib/store"
import { LugarCard } from "@/components/dashboard/LugarCard"

interface LugarProduccion {
  id_lugar_produccion: number
  nombre_lugar: string
  area_total: number
  numero_predial: string
}

// Componente Envoltorio para hacer las tarjetas ordenables sin botones feos
function SortableItem({ lugar, user, onDelete, onUpdate, onAgendar }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: lugar.id_lugar_produccion });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    scale: isDragging ? 1.02 : 1,
    zIndex: isDragging ? 100 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="relative touch-none cursor-grab active:cursor-grabbing outline-none"
    >
      <LugarCard
        predio={lugar}
        user={user}
        onDelete={onDelete}
        onUpdate={onUpdate}
        onAgendar={onAgendar}
      />
    </div>
  );
}

export default function PrediosPage() {
  const { user } = useUserStore()
  const [lugares, setLugares] = useState<LugarProduccion[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeId, setActiveId] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    predio: "",
    nombre: "",
    area: ""
  })

  // Sensores para detectar mouse, touch y teclado
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Previene arrastres accidentales al hacer clic
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchLugares()
  }, [])

  const fetchLugares = async () => {
    try {
      const res = await api.get("/predios/lugares-produccion")
      const fetchedLugares = res.data
      
      // Intentar recuperar el orden guardado en el navegador
      const savedOrder = localStorage.getItem(`orden-predios-${user?.id_usuario}`)
      if (savedOrder && fetchedLugares.length > 0) {
        const orderIds = JSON.parse(savedOrder)
        // Reordenar los lugares según los IDs guardados
        const sortedLugares = [...fetchedLugares].sort((a, b) => {
          const indexA = orderIds.indexOf(a.id_lugar_produccion)
          const indexB = orderIds.indexOf(b.id_lugar_produccion)
          // Si un ID no está en el orden guardado, lo mandamos al final
          return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB)
        })
        setLugares(sortedLugares)
      } else {
        setLugares(fetchedLugares)
      }
    } catch (error) {
      console.error("Error cargando lugares:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(Number(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (over && active.id !== over.id) {
      setLugares((items) => {
        const oldIndex = items.findIndex((i) => i.id_lugar_produccion === active.id)
        const newIndex = items.findIndex((i) => i.id_lugar_produccion === over.id)
        const newItems = arrayMove(items, oldIndex, newIndex)
        
        // GUARDAR EN LOCALSTORAGE: Solo guardamos los IDs en el orden actual
        const orderIds = newItems.map(item => item.id_lugar_produccion)
        localStorage.setItem(`orden-predios-${user?.id_usuario}`, JSON.stringify(orderIds))
        
        return newItems
      })
    }
  }

  const handleDeleteLugar = async (id: number) => {
    try {
      await api.delete(`/predios/lugares-produccion/${id}`)
      setLugares(prev => prev.filter(p => p.id_lugar_produccion !== id))
    } catch (error) {
      console.error("Error al eliminar lugar:", error)
    }
  }

  const handleUpdateLugar = async (id: number, newName: string) => {
    try {
      await api.put(`/predios/lugares-produccion/${id}`, { nombre_lugar: newName })
      setLugares(prev => prev.map(p =>
        p.id_lugar_produccion === id ? { ...p, nombre_lugar: newName } : p
      ))
    } catch (error) {
      console.error("Error al actualizar lugar:", error)
    }
  }

  const handleAgendar = (idLugar: number) => {
    window.location.href = `/dashboard/inspecciones/agendar?id_lugar_produccion=${idLugar}`;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await api.post("/predios/lugares-produccion", {
        nombre_lugar: formData.nombre,
        area_total_m2: Number(formData.area),
        numero_predial: user?.numero_predial || formData.predio
      })
      setShowModal(false)
      setFormData({ predio: "", nombre: "", area: "" })
      await fetchLugares()
    } catch (error: any) {
      alert(error.response?.data?.error || "Error al registrar")
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <Navigation className="text-emerald-500 w-10 h-10" />
            Lugares de Producción
          </h1>
          <p className="text-slate-400 mt-2 text-lg">Administre sus áreas de cultivo con arrastre inteligente.</p>
        </div>

        <Button
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-14 px-8 rounded-2xl shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5 mr-2" /> Registrar Lugar
        </Button>
      </div>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={lugares.map(l => l.id_lugar_produccion)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {lugares.map((lugar) => (
              <SortableItem
                key={lugar.id_lugar_produccion}
                lugar={lugar}
                user={user}
                onDelete={handleDeleteLugar}
                onUpdate={handleUpdateLugar}
                onAgendar={handleAgendar}
              />
            ))}
          </div>
        </SortableContext>

        {/* Overlay para ver la tarjeta mientras se arrastra */}
        <DragOverlay adjustScale={true}>
          {activeId ? (
            <div className="scale-105 opacity-80 cursor-grabbing">
              <LugarCard
                predio={lugares.find(l => l.id_lugar_produccion === activeId)}
                user={user}
                onDelete={() => {}}
                onUpdate={() => {}}
                onAgendar={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {lugares.length === 0 && (
        <div className="col-span-full py-20 text-center bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem]">
          <MapPin className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500 text-xl font-medium">No tiene lugares registrados aún.</p>
        </div>
      )}

      {/* Modal de Registro */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
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
                  <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-800 rounded-full">
                    <X className="w-6 h-6 text-slate-500" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">Finca Asociada</label>
                    <div className="w-full bg-slate-950/50 border border-emerald-500/30 rounded-2xl py-5 px-6 text-emerald-400 font-bold text-lg cursor-not-allowed italic">
                      {user?.nombre_predio || "Principal"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre del Lugar</label>
                    <input
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-white focus:border-emerald-500 outline-none transition-all text-lg"
                      placeholder="Ej: Lote San Jerónimo"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">Área Total (m²)</label>
                    <input
                      required
                      type="number"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-white focus:border-emerald-500 outline-none transition-all text-lg"
                      placeholder="Ej: 5000"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    />
                  </div>

                  <Button
                    disabled={isSaving}
                    className="w-full h-16 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xl rounded-2xl shadow-xl mt-8"
                  >
                    {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : "GUARDAR REGISTRO"}
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

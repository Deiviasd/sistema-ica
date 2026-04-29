"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ClipboardList, Loader2, History, Search } from "lucide-react"
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import api from "@/lib/api"
import { Inspection } from "./types/inspection"
import { InspectionCard } from "./components/InspectionCard"
import { InspectionWizard } from "./components/InspectionWizard"
import { InformeCompletoModal } from "./components/InformeCompletoModal"
import { useUserStore } from "@/lib/store"

// Envoltorio Sortable para las Inspecciones
function SortableInspection({ inspection, onStart }: { inspection: Inspection, onStart: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: inspection.id_inspeccion });

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
      <InspectionCard
        inspection={inspection}
        onStart={onStart}
      />
    </div>
  );
}

export default function TecnicoDashboard() {
  const { user } = useUserStore()
  const [inspecciones, setInspecciones] = useState<Inspection[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null)
  const [viewingReport, setViewingReport] = useState<Inspection | null>(null)
  const [activeId, setActiveId] = useState<number | string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchAssignments()
  }, [])

  const fetchAssignments = async () => {
    try {
      const res = await api.get("/inspecciones/asignadas")
      const fetchedInspecciones = res.data

      // Recuperar orden del LocalStorage
      const savedOrder = localStorage.getItem(`orden-tecnico-${user?.id_usuario}`)
      if (savedOrder && fetchedInspecciones.length > 0) {
        const orderIds = JSON.parse(savedOrder)
        const sorted = [...fetchedInspecciones].sort((a, b) => {
          const indexA = orderIds.indexOf(a.id_inspeccion)
          const indexB = orderIds.indexOf(b.id_inspeccion)
          return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB)
        })
        setInspecciones(sorted)
      } else {
        setInspecciones(fetchedInspecciones)
      }
    } catch (error) {
      console.error("Error al cargar asignaciones:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (over && active.id !== over.id) {
      setInspecciones((items) => {
        const oldIndex = items.findIndex((i) => i.id_inspeccion === active.id)
        const newIndex = items.findIndex((i) => i.id_inspeccion === over.id)
        const newItems = arrayMove(items, oldIndex, newIndex)
        
        // Guardar nuevo orden
        const orderIds = newItems.map(item => item.id_inspeccion)
        localStorage.setItem(`orden-tecnico-${user?.id_usuario}`, JSON.stringify(orderIds))
        
        return newItems
      })
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
      <p className="text-muted-foreground font-bold text-lg animate-pulse uppercase tracking-[0.2em]">
        Sincronizando Agenda
      </p>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {viewingReport && (
        <InformeCompletoModal
          inspection={viewingReport}
          onClose={() => setViewingReport(null)}
        />
      )}

      <AnimatePresence mode="wait">
        {!selectedInspection ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-emerald-600/10 rounded-3xl flex items-center justify-center border border-emerald-500/20">
                  <History className="text-emerald-500 w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-4xl font-black italic tracking-tighter uppercase">
                    Inspecciones Programadas
                  </h1>
                  <p className="text-muted-foreground font-bold text-xs uppercase tracking-[0.3em]">
                    Gestión de cumplimiento fitosanitario • ICA
                  </p>
                </div>
              </div>
              <div className="flex bg-card p-2 rounded-2xl border border-border">
                <div className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black italic uppercase tracking-tighter shadow-lg shadow-emerald-500/20">
                  {inspecciones.length} CITAS HOY
                </div>
              </div>
            </div>

            {/* Grid de cards con DND-KIT */}
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={inspecciones.map(i => i.id_inspeccion)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {inspecciones.length === 0 ? (
                    <div className="col-span-full py-32 text-center bg-muted/20 border-2 border-dashed border-border rounded-[3rem]">
                      <Search className="w-20 h-20 text-muted-foreground mx-auto mb-6 opacity-20" />
                      <p className="text-muted-foreground text-2xl font-black italic tracking-tighter uppercase opacity-50">
                        Sin asignaciones pendientes
                      </p>
                      <p className="text-muted-foreground font-bold mt-2 opacity-40">
                        Todo el equipo está al día con las verificaciones agrícolas.
                      </p>
                    </div>
                  ) : (
                    inspecciones.map((insp) => (
                      <SortableInspection
                        key={insp.id_inspeccion}
                        inspection={insp}
                        onStart={() => {
                          if (insp.estado === 'finalizada') {
                            setViewingReport(insp)
                          } else {
                            setSelectedInspection(insp)
                          }
                        }}
                      />
                    ))
                  )}
                </div>
              </SortableContext>

              {/* Overlay mientras se arrastra */}
              <DragOverlay adjustScale={true}>
                {activeId ? (() => {
                  const activeInsp = inspecciones.find(i => String(i.id_inspeccion) === String(activeId));
                  if (!activeInsp) return null;
                  return (
                    <div className="scale-105 opacity-80 cursor-grabbing">
                      <InspectionCard
                        inspection={activeInsp}
                        onStart={() => {}}
                      />
                    </div>
                  );
                })() : null}
              </DragOverlay>
            </DndContext>
          </motion.div>
        ) : (
          <InspectionWizard
            inspection={selectedInspection}
            onClose={() => { setSelectedInspection(null); fetchAssignments() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

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
import { createClient } from "@/lib/supabase/client"
import { createBrowserClient } from "@supabase/ssr" // Importamos para el cliente secundario
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { ShieldAlert, Info, MapPin, User, X, Calendar } from "lucide-react"
import { Button } from "../ui/button"

// Cliente secundario con aislamiento de sesión para evitar conflictos de cookies de Auth entre proyectos
// Las credenciales se leen desde variables de entorno definidas en .env.local
const supabaseInspecciones = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_INSPECCIONES_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_INSPECCIONES_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

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

  // 🔔 Estado para la alerta de cancelación en tiempo real
  const [cancellationAlerts, setCancellationAlerts] = useState<{
    id_inspeccion: number
    nombre_predio: string
    nombre_lugar: string
    productor_nombre: string
    total_lugares: number
    total_lotes: number
    ubicacion?: string
    fecha?: string
    id_predio?: number | string
    lugar_produccion?: any
    predio?: any
  }[]>([])

  const [showAlertModal, setShowAlertModal] = useState(false)
  const [currentAlertIndex, setCurrentAlertIndex] = useState(0)

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
    // Esperar a que el usuario esté disponible
    if (!user) return;

    fetchAssignments();

    const userId = String(user?.id_usuario ?? user?.id ?? '');

    if (!userId) {
      console.warn('⚠️ No se pudo obtener el ID del usuario para suscripción realtime');
      return;
    }

    const channel = supabaseInspecciones
      .channel(`cambios-inspeccion-tecnico-${userId}`) // canal único por usuario
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'inspeccion'
        },
        async (payload: any) => {
          console.log('📡 [REALTIME] Cambio detectado:', payload.new);

          const esParaMi =
            String(payload.new.tecnico_id) === userId;

          if (!esParaMi || payload.new.estado !== 'cancelada') return;

          console.log('🚨 [REALTIME] ¡Inspección cancelada para este técnico!');

          // Remover de la lista inmediatamente (optimistic update)
          setInspecciones(prev =>
            prev.filter(ins => ins.id_inspeccion !== payload.new.id_inspeccion)
          );

          try {
            const res = await api.get(`/inspecciones/${payload.new.id_inspeccion}/contexto`)
            const fullData = res.data

            setCancellationAlerts(prev => [...prev, {
              id_inspeccion: fullData.id_inspeccion,
              nombre_predio: fullData.nombre_predio_oficial || 'Predio Desconocido',
              nombre_lugar: fullData.lugares_produccion?.map((l: any) => l.nombre_empresa || l.nombre_lugar).join(', ') || 'Lugar no disponible',
              productor_nombre: fullData.productor?.nombre || 'Productor no disponible',
              total_lugares: fullData.lugares_produccion?.length ?? 0,
              total_lotes: fullData.total_lotes ?? 0,
              ubicacion: fullData.productor?.ubicacion || 'Ubicación no disponible',
              fecha: payload.new.fecha_programada || 'Fecha no disponible',
              id_predio: fullData.id_predio,
              lugar_produccion: fullData.lugares_produccion?.find((l: any) => l.id_lugar_produccion === fullData.id_lugar_produccion)
            }])
          } catch (err) {
            console.warn('⚠️ Usando datos básicos del payload:', err)
            setCancellationAlerts(prev => [...prev, {
              id_inspeccion: payload.new.id_inspeccion,
              nombre_predio: 'Predio Desconocido',
              nombre_lugar: 'Lugar no disponible',
              productor_nombre: 'Verificar en historial',
              total_lugares: 0,
              total_lotes: 0,
              ubicacion: 'Ubicación no disponible',
              fecha: payload.new.fecha_programada || 'Fecha no disponible',
            }])
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 [REALTIME] Estado de suscripción:', status);

        if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error en canal realtime, refrescando datos...');
          fetchAssignments();
        }
      });

    return () => {
      console.log('🔌 Desconectando canal realtime');
      supabaseInspecciones.removeChannel(channel);
    };
  }, [user]); // considera separar el canal de fetchAssignments si user cambia frecuentemente
  const fetchAssignments = async () => {
    try {
      const res = await api.get("/inspecciones/asignadas")
      const fetchedInspecciones = res.data.filter((ins: Inspection) => ins.estado !== 'cancelada')

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
                        onStart={() => { }}
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

      {/* 🚨 MODAL DE ALERTA DE CANCELACIÓN EN TIEMPO REAL */}
      {/* 🔔 BOTÓN FLOTANTE DE ALERTAS */}
      {cancellationAlerts.length > 0 && (
        <motion.button
          onClick={() => { setShowAlertModal(true); setCurrentAlertIndex(0) }}
          className="fixed bottom-8 right-8 z-[90] w-16 h-16 bg-rose-600 rounded-full flex items-center justify-center shadow-2xl shadow-rose-600/50 cursor-pointer"
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(225, 29, 72, 0.7)',
              '0 0 0 20px rgba(225, 29, 72, 0)',
              '0 0 0 0 rgba(225, 29, 72, 0)',
            ],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <ShieldAlert className="text-white w-7 h-7" />
          {/* Badge contador */}
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-white text-rose-600 text-xs font-black rounded-full flex items-center justify-center border-2 border-rose-600">
            {cancellationAlerts.length}
          </span>
        </motion.button>
      )}

      {/* 🚨 MODAL DE ALERTAS EN COLA */}
      <AnimatePresence>
        {showAlertModal && cancellationAlerts.length > 0 && (() => {
          const alert = cancellationAlerts[currentAlertIndex]
          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
              <motion.div
                key={currentAlertIndex}
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-md bg-slate-900 border-4 border-rose-600/30 rounded-[3rem] p-10 shadow-2xl shadow-rose-950/40"
              >
                {/* Ícono superior */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-rose-600 rounded-full flex items-center justify-center shadow-lg shadow-rose-600/40 border-8 border-slate-900">
                  <ShieldAlert className="text-white w-10 h-10 animate-pulse" />
                </div>

                {/* Contador de cola */}
                {cancellationAlerts.length > 1 && (
                  <div className="absolute top-6 right-6 bg-rose-600/20 border border-rose-600/30 rounded-full px-3 py-1">
                    <span className="text-rose-400 text-xs font-black">
                      {currentAlertIndex + 1} / {cancellationAlerts.length}
                    </span>
                  </div>
                )}

                <div className="text-center mt-8 space-y-6">
                  <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">
                    ¡Inspección <span className="text-rose-500">Cancelada!</span>
                  </h2>
                  <p className="text-slate-400 font-bold text-sm leading-relaxed">
                    Se canceló la siguiente asignación de tu agenda:
                  </p>

                  {/* Tarjeta de info */}
                  <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-left space-y-4">

                    {/* Predio */}
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center shrink-0">
                        <ShieldAlert className="text-rose-500 w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Predio</p>
                        <p className="text-md font-black text-white italic">{alert.nombre_predio}</p>
                      </div>
                    </div>

                    {/* Lugar de producción */}
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-teal-500/10 rounded-xl flex items-center justify-center shrink-0">
                        <MapPin className="text-teal-500 w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lugar de Producción</p>
                        <p className="text-md font-black text-white italic">{alert.nombre_lugar}</p>
                      </div>
                    </div>

                    {/* Productor */}
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
                        <User className="text-blue-500 w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Productor</p>
                        <p className="text-md font-black text-white italic">{alert.productor_nombre}</p>
                      </div>
                    </div>

                    {/* Ubicación */}
                    <div
                      className="flex items-start gap-4 cursor-pointer hover:bg-slate-800/50 p-2 rounded-xl transition-colors"
                      onClick={() => {
                        if (alert.ubicacion) {
                          window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(alert.ubicacion)}`, '_blank');
                        }
                      }}
                      title="Ver en Google Maps"
                    >
                      <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
                        <MapPin className="text-amber-500 w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ubicación</p>
                        <p className="text-sm font-bold text-white leading-tight hover:text-emerald-400 transition-colors">{alert.ubicacion}</p>
                      </div>
                    </div>

                    {/* Fecha */}
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0">
                        <Calendar className="text-indigo-500 w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha Programada</p>
                        <p className="text-sm font-bold text-white">{alert.fecha && alert.fecha !== 'Fecha no disponible' ? new Date(alert.fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No disponible'}</p>
                      </div>
                    </div>

                    {/* Estadísticas del predio */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                      <div className="bg-slate-900 rounded-2xl p-3 text-center">
                        <p className="text-2xl font-black text-emerald-400">{alert.total_lugares}</p>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lugares</p>
                      </div>
                      <div className="bg-slate-900 rounded-2xl p-3 text-center">
                        <p className="text-2xl font-black text-emerald-400">{alert.total_lotes}</p>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lotes</p>
                      </div>
                    </div>
                  </div>

                  {/* Botones de navegación y confirmación */}
                  <div className="pt-2 space-y-3">
                    {cancellationAlerts.length > 1 && (
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          onClick={() => setCurrentAlertIndex(i => Math.max(0, i - 1))}
                          disabled={currentAlertIndex === 0}
                          className="h-12 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl disabled:opacity-30"
                        >
                          ← Anterior
                        </Button>
                        <Button
                          onClick={() => setCurrentAlertIndex(i => Math.min(cancellationAlerts.length - 1, i + 1))}
                          disabled={currentAlertIndex === cancellationAlerts.length - 1}
                          className="h-12 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl disabled:opacity-30"
                        >
                          Siguiente →
                        </Button>
                      </div>
                    )}

                    <Button
                      onClick={() => {
                        // Eliminar la alerta actual de la cola
                        setCancellationAlerts(prev => prev.filter((_, i) => i !== currentAlertIndex))
                        // Ajustar índice si era la última
                        setCurrentAlertIndex(prev => Math.max(0, prev - (currentAlertIndex >= cancellationAlerts.length - 1 ? 1 : 0)))
                        // Cerrar modal si no quedan más
                        if (cancellationAlerts.length === 1) setShowAlertModal(false)
                      }}
                      className="w-full h-16 bg-rose-600 hover:bg-rose-500 text-white font-black text-lg rounded-2xl transition-all shadow-lg shadow-rose-600/20"
                    >
                      CONFIRMAR LECTURA
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
  GripVertical,
  AlertTriangle
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
  id_predio: number
  id_lugar_produccion: number
  nombre_predio: string
  area_hectareas: number
  numero_predial: string
  lugar_produccion?: {
    nombre_lugar: string
  }
}

// Componente Envoltorio para hacer las tarjetas ordenables sin botones feos
function SortableItem({ lugar, user, onDelete, onUpdate, onAgendar, isLocked }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: lugar.id_predio });

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
        isLocked={isLocked}
      />
    </div>
  );
}

export default function PrediosPage() {
  const { user } = useUserStore()
  const [lugares, setLugares] = useState<LugarProduccion[]>([])
  const [lockedLugares, setLockedLugares] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeId, setActiveId] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    id_lugar_produccion: "",
    nombre: "",
    area: "",
    numero_predial: "",
    departamento: "",
    municipio: "",
    vereda: "",
    direccion: "",
    es_propietario: true,
    prop_nombre: "",
    prop_identificacion: "",
    prop_telefono: "",
    prop_email: "",
    misma_ubicacion: false,
    latitud: "",
    longitud: ""
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

  const [lugaresProduccion, setLugaresProduccion] = useState<any[]>([])
  const [departamentos, setDepartamentos] = useState<any[]>([])
  const [municipios, setMunicipios] = useState<any[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const router = useRouter()

  // 🛡️ Protección de Ruta por Roles
  useEffect(() => {
    if (user && user.role !== "productor") {
      router.push("/dashboard")
    }
  }, [user, router])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const resPredios = await api.get("/predios/list")
      const fetchedPredios = resPredios.data

      const resLugares = await api.get("/predios/lugares-produccion")
      const fetchedLugares = resLugares.data
      setLugaresProduccion(fetchedLugares)

      // 🔒 Cargar inspecciones activas para bloquear los predios
      try {
        const resInspecciones = await api.get("/inspecciones/reporte")
        const activeInsps = (resInspecciones.data || []).filter(
          (ins: any) => ins.estado === "programada" || ins.estado === "en_proceso"
        )
        const lockedIds = activeInsps.map((ins: any) => Number(ins.id_lugar_produccion)).filter(Boolean)
        setLockedLugares(lockedIds)
      } catch (err) {
        console.error("⚠️ Error cargando inspecciones activas para bloqueo:", err)
      }

      // Cargar Departamentos (Misma lógica que en Register)
      fetch("https://api-colombia.com/api/v1/Department")
        .then(res => res.json())
        .then(data => setDepartamentos(data.sort((a: any, b: any) => a.name.localeCompare(b.name))))
        .catch(err => console.error("Error cargando departamentos:", err))

      // AUTO-SELECCIÓN: Si solo hay uno, lo ponemos de una vez
      if (fetchedLugares.length === 1) {
        setFormData(prev => ({ ...prev, id_lugar_produccion: fetchedLugares[0].id_lugar_produccion.toString() }))
      }

      const savedOrder = localStorage.getItem(`orden-predios-${user?.id_usuario}`)
      if (savedOrder && fetchedPredios.length > 0) {
        const orderIds = JSON.parse(savedOrder)
        const sortedPredios = [...fetchedPredios].sort((a, b) => {
          const indexA = orderIds.indexOf(a.id_predio)
          const indexB = orderIds.indexOf(b.id_predio)
          return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB)
        })
        setLugares(sortedPredios)
      } else {
        setLugares(fetchedPredios)
      }
    } catch (error) {
      console.error("Error cargando datos:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDepartamentoChange = (deptId: string, deptName: string) => {
    setFormData({ ...formData, departamento: deptName, municipio: "" })
    setMunicipios([])
    fetch(`https://api-colombia.com/api/v1/Department/${deptId}/cities`)
      .then(res => res.json())
      .then(data => setMunicipios(data.sort((a: any, b: any) => a.name.localeCompare(b.name))))
      .catch(err => console.error("Error cargando municipios:", err))
  }

  const handleMismaUbicacionToggle = () => {
    const nextVal = !formData.misma_ubicacion;
    const lugar = lugaresProduccion.find(l => l.id_lugar_produccion.toString() === formData.id_lugar_produccion);
    
    setFormData(prev => {
      const updated = { ...prev, misma_ubicacion: nextVal };
      if (nextVal && lugar?.region) {
        updated.departamento = lugar.region.departamento || "";
        updated.municipio = lugar.region.municipio || "";
        updated.vereda = lugar.region.vereda || "";
        updated.direccion = lugar.region.direccion || "";
        
        // Cargar municipios de ese departamento
        const deptObj = departamentos.find(d => d.name === lugar.region.departamento);
        if (deptObj) {
          fetch(`https://api-colombia.com/api/v1/Department/${deptObj.id}/cities`)
            .then(res => res.json())
            .then(data => setMunicipios(data.sort((a: any, b: any) => a.name.localeCompare(b.name))))
            .catch(err => console.error("Error cargando municipios:", err))
        }
      } else if (!nextVal) {
        updated.departamento = "";
        updated.municipio = "";
        updated.vereda = "";
        updated.direccion = "";
        setMunicipios([]);
      }
      return updated;
    });
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(Number(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (over && active.id !== over.id) {
      setLugares((items) => {
        const oldIndex = items.findIndex((i) => i.id_predio === active.id)
        const newIndex = items.findIndex((i) => i.id_predio === over.id)
        const newItems = arrayMove(items, oldIndex, newIndex)

        // GUARDAR EN LOCALSTORAGE: Solo guardamos los IDs en el orden actual
        const orderIds = newItems.map(item => item.id_predio)
        localStorage.setItem(`orden-predios-${user?.id_usuario}`, JSON.stringify(orderIds))

        return newItems
      })
    }
  }

  const handleDeleteLugar = async (id: number) => {
    try {
      await api.delete(`/predios/predios/${id}`)
      setLugares(prev => prev.filter(p => p.id_predio !== id))
    } catch (error) {
      console.error("Error al eliminar predio:", error)
    }
  }

  const handleUpdateLugar = async (id: number, newName: string) => {
    try {
      await api.put(`/predios/predios/${id}`, { nombre_predio: newName })
      setLugares(prev => prev.map(p =>
        p.id_predio === id ? { ...p, nombre_predio: newName } : p
      ))
    } catch (error) {
      console.error("Error al actualizar predio:", error)
    }
  }

  const handleAgendar = (idLugar: number) => {
    window.location.href = `/dashboard/agendar?id_lugar_produccion=${idLugar}`;
  }

  // 🛡️ Validador de Texto Real
  const isMeaningful = (text: string) => {
    if (text.trim().length < 4) return false;
    // Evita repeticiones de más de 2 caracteres iguales (ej: aaa)
    if (/(.)\1{2,}/i.test(text)) return false;
    // Evita cadenas que parezcan puro teclado aleatorio (pocas vocales o patrones extraños)
    const vowels = text.match(/[aeiou]/gi);
    if (!vowels || vowels.length < 1) return false;
    return true;
  }

  // ✨ Formateador a Título (Ej: san jose -> San Jose)
  const toTitleCase = (str: string) => {
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrorMsg(null)

    // Validaciones básicas en pantalla
    if (!formData.departamento || !formData.municipio || !formData.vereda || !formData.direccion) {
      setErrorMsg("Todos los campos de ubicación (Departamento, Municipio, Vereda y Dirección) son obligatorios.")
      setIsSaving(false)
      return
    }

    if (!isMeaningful(formData.vereda) || !isMeaningful(formData.direccion)) {
      setErrorMsg("La vereda o dirección parecen inválidas. Por favor, ingrese información real y evite repetir caracteres.")
      setIsSaving(false)
      return
    }

    try {
      // 1. Registrar la nueva ubicación (Región)
      const resRegion = await api.post("/predios/regiones", {
        departamento: formData.departamento,
        municipio: formData.municipio,
        vereda: toTitleCase(formData.vereda),
        direccion: toTitleCase(formData.direccion)
      })
      const id_region = resRegion.data.id_region

      // 2. Lógica de Propietario
      const ownerData = formData.es_propietario ? {
        prop_nombre: user?.nombre || '',
        prop_identificacion: (user?.documento || user?.identificacion || user?.numero_documento || '').toString(),
        prop_telefono: user?.telefono || '',
        prop_email: user?.email || ''
      } : {
        prop_nombre: formData.prop_nombre,
        prop_identificacion: formData.prop_identificacion,
        prop_telefono: formData.prop_telefono,
        prop_email: formData.prop_email
      }

      // 3. Registrar el Predio vinculado a la nueva región
      await api.post("/predios/predios", {
        id_lugar_produccion: Number(formData.id_lugar_produccion),
        id_region: id_region,
        nombre_predio: formData.nombre,
        area_hectareas: Number(formData.area),
        numero_predial: formData.numero_predial,
        latitud: formData.latitud ? parseFloat(formData.latitud) : null,
        longitud: formData.longitud ? parseFloat(formData.longitud) : null,
        ...ownerData
      })

      setShowModal(false)
      setFormData({
        id_lugar_produccion: lugaresProduccion.length === 1 ? lugaresProduccion[0].id_lugar_produccion.toString() : "",
        nombre: "", area: "", numero_predial: "",
        departamento: "", municipio: "", vereda: "", direccion: "",
        es_propietario: true, prop_nombre: "", prop_identificacion: "", prop_telefono: "", prop_email: "",
        misma_ubicacion: false, latitud: "", longitud: ""
      })
      await fetchData()
    } catch (error: any) {
      setErrorMsg(error.response?.data?.error || "Error al registrar el predio. Intente de nuevo.")
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
            Mis Predios
          </h1>
          <p className="text-slate-400 mt-2 text-lg">Administre sus unidades productivas con arrastre inteligente.</p>
        </div>

        <Button
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-14 px-8 rounded-2xl shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5 mr-2" /> Registrar Predio
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={lugares.map(l => l.id_predio)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {lugares.map((lugar) => (
              <SortableItem
                key={lugar.id_predio}
                id={lugar.id_predio}
                lugar={lugar}
                user={user}
                onDelete={handleDeleteLugar}
                onUpdate={handleUpdateLugar}
                onAgendar={handleAgendar}
                isLocked={lockedLugares.includes(Number(lugar.id_lugar_produccion || (lugar as any).lugar_produccion?.id_lugar_produccion))}
              />
            ))}
          </div>
        </SortableContext>

        {/* Overlay para ver la tarjeta mientras se arrastra */}
        <DragOverlay adjustScale={true}>
          {activeId ? (
            <div className="scale-105 opacity-80 cursor-grabbing">
              <LugarCard
                predio={lugares.find(l => l.id_predio === activeId)}
                user={user}
                onDelete={() => { }}
                onUpdate={() => { }}
                onAgendar={() => { }}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {lugares.length === 0 && (
        <div className="col-span-full py-20 text-center bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem]">
          <MapPin className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500 text-xl font-medium">No tiene predios registrados aún.</p>
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
              className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-y-auto max-h-[92vh] custom-scrollbar"
            >
              <div className="p-6 lg:p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">Nuevo Registro</h2>
                  <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Lugar de Producción</label>
                      {lugaresProduccion.length > 1 ? (
                        <select
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white focus:border-emerald-500 outline-none transition-all text-sm appearance-none h-12"
                          value={formData.id_lugar_produccion}
                          onChange={(e) => {
                            const val = e.target.value;
                            const lugar = lugaresProduccion.find(lp => lp.id_lugar_produccion.toString() === val);
                            setFormData(prev => {
                              const updated = { ...prev, id_lugar_produccion: val };
                              if (prev.misma_ubicacion && lugar?.region) {
                                updated.departamento = lugar.region.departamento || "";
                                updated.municipio = lugar.region.municipio || "";
                                updated.vereda = lugar.region.vereda || "";
                                updated.direccion = lugar.region.direccion || "";

                                // Cargar municipios
                                const deptObj = departamentos.find(d => d.name === lugar.region.departamento);
                                if (deptObj) {
                                  fetch(`https://api-colombia.com/api/v1/Department/${deptObj.id}/cities`)
                                    .then(res => res.json())
                                    .then(data => setMunicipios(data.sort((a: any, b: any) => a.name.localeCompare(b.name))))
                                    .catch(err => console.error("Error cargando municipios:", err))
                                }
                              }
                              return updated;
                            });
                          }}
                        >
                          <option value="">Seleccionar Lugar...</option>
                          {lugaresProduccion.map(lp => (
                            <option key={lp.id_lugar_produccion} value={lp.id_lugar_produccion}>
                              {lp.nombre_lugar}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="w-full bg-slate-950/50 border border-emerald-500/30 rounded-xl py-2.5 px-4 text-emerald-400 font-bold text-sm italic flex items-center justify-between h-12">
                          {lugaresProduccion[0]?.nombre_lugar || "Cargando..."}
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                      )}

                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre del Predio</label>
                      <input
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white focus:border-emerald-500 outline-none transition-all text-sm h-12"
                        placeholder="Ej: Lote San Jerónimo"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Toggle para usar la misma ubicación del lugar de producción */}
                  {formData.id_lugar_produccion && (
                    <div className="flex items-center justify-between bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                      <span className="text-xs font-bold text-white uppercase tracking-tight">¿La ubicación es la misma que la del lugar de producción?</span>
                      <div
                        onClick={handleMismaUbicacionToggle}
                        className="w-16 h-8 rounded-full p-1 cursor-pointer transition-colors relative flex items-center bg-slate-700"
                        style={{ backgroundColor: formData.misma_ubicacion ? '#059669' : '#374151' }}
                      >
                        <span className={`absolute left-2 text-[9px] font-black text-white transition-opacity ${formData.misma_ubicacion ? 'opacity-100' : 'opacity-0'}`}>SÍ</span>
                        <span className={`absolute right-2 text-[9px] font-black text-white transition-opacity ${formData.misma_ubicacion ? 'opacity-0' : 'opacity-100'}`}>NO</span>
                        <motion.div
                          animate={{ x: formData.misma_ubicacion ? 32 : 0 }}
                          className="w-6 h-6 bg-white rounded-full shadow-md z-10"
                        />
                      </div>
                    </div>
                  )}

                  {formData.misma_ubicacion && (
                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <p className="text-[11px] text-emerald-400 font-medium">Se usará la ubicación registrada del Lugar de Producción.</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Departamento</label>
                      <select
                        required
                        disabled={formData.misma_ubicacion}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white focus:border-emerald-500 outline-none transition-all text-sm h-12 appearance-none disabled:opacity-50"
                        value={departamentos.find(d => d.name === formData.departamento)?.id || ""}
                        onChange={(e) => {
                          const dept = departamentos.find(d => d.id === Number(e.target.value))
                          if (dept) handleDepartamentoChange(dept.id, dept.name)
                        }}
                      >
                        <option value="">Seleccionar...</option>
                        {departamentos.map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Municipio</label>
                      <select
                        required
                        disabled={formData.misma_ubicacion || !formData.departamento}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white focus:border-emerald-500 outline-none transition-all text-sm h-12 appearance-none disabled:opacity-50"
                        value={formData.municipio}
                        onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
                      >
                        <option value="">Seleccionar...</option>
                        {municipios.map(city => (
                          <option key={city.id} value={city.name}>{city.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Vereda</label>
                      <input
                        required
                        disabled={formData.misma_ubicacion}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white focus:border-emerald-500 outline-none transition-all text-sm h-12 disabled:opacity-50"
                        placeholder="Ej: El Placer"
                        value={formData.vereda}
                        onChange={(e) => setFormData({ ...formData, vereda: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Dirección / Referencia</label>
                    <input
                      required
                      disabled={formData.misma_ubicacion}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white focus:border-emerald-500 outline-none transition-all text-sm h-12 disabled:opacity-50"
                      placeholder="Ej: Km 5 vía al mar, portón verde"
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Área Total (Hectáreas)</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white focus:border-emerald-500 outline-none transition-all text-sm h-12"
                        placeholder="Ej: 5.5"
                        value={formData.area}
                        onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Número Predial / ICA</label>
                      <input
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white focus:border-emerald-500 outline-none transition-all text-sm h-12"
                        placeholder="Ej: 123456789"
                        value={formData.numero_predial}
                        onChange={(e) => setFormData({ ...formData, numero_predial: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Latitud (Opcional)</label>
                      <input
                        type="number"
                        step="any"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white focus:border-emerald-500 outline-none transition-all text-sm h-12"
                        placeholder="Ej: 5.0688"
                        value={formData.latitud}
                        onChange={(e) => setFormData({ ...formData, latitud: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Longitud (Opcional)</label>
                      <input
                        type="number"
                        step="any"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white focus:border-emerald-500 outline-none transition-all text-sm h-12"
                        placeholder="Ej: -75.5174"
                        value={formData.longitud}
                        onChange={(e) => setFormData({ ...formData, longitud: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Lógica de Propietario */}
                  <div className="pt-4 border-t border-slate-800/80 space-y-4">
                    <div className="flex items-center justify-between bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                      <span className="text-xs font-bold text-white uppercase tracking-tight">¿Es usted el propietario?</span>
                      <div
                        onClick={() => setFormData({ ...formData, es_propietario: !formData.es_propietario })}
                        className="w-16 h-8 rounded-full p-1 cursor-pointer transition-colors relative flex items-center bg-slate-700"
                        style={{ backgroundColor: formData.es_propietario ? '#059669' : '#374151' }}
                      >
                        <span className={`absolute left-2 text-[9px] font-black text-white transition-opacity ${formData.es_propietario ? 'opacity-100' : 'opacity-0'}`}>SÍ</span>
                        <span className={`absolute right-2 text-[9px] font-black text-white transition-opacity ${formData.es_propietario ? 'opacity-0' : 'opacity-100'}`}>NO</span>
                        <motion.div
                          animate={{ x: formData.es_propietario ? 32 : 0 }}
                          className="w-6 h-6 bg-white rounded-full shadow-md z-10"
                        />
                      </div>
                    </div>

                    {!formData.es_propietario && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-3"
                      >
                        <input
                          required
                          className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white text-xs h-10 focus:border-emerald-500 outline-none"
                          placeholder="Nombre Propietario"
                          value={formData.prop_nombre}
                          onChange={(e) => setFormData({ ...formData, prop_nombre: e.target.value })}
                        />
                        <input
                          required
                          className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white text-xs h-10 focus:border-emerald-500 outline-none"
                          placeholder="ID / Cédula"
                          value={formData.prop_identificacion}
                          onChange={(e) => setFormData({ ...formData, prop_identificacion: e.target.value })}
                        />
                        <input
                          required
                          className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white text-xs h-10 focus:border-emerald-500 outline-none"
                          placeholder="Teléfono"
                          value={formData.prop_telefono}
                          onChange={(e) => setFormData({ ...formData, prop_telefono: e.target.value })}
                        />
                        <input
                          required
                          type="email"
                          className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white text-xs h-10 focus:border-emerald-500 outline-none"
                          placeholder="Email"
                          value={formData.prop_email}
                          onChange={(e) => setFormData({ ...formData, prop_email: e.target.value })}
                        />
                      </motion.div>
                    )}

                    {formData.es_propietario && (
                      <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <p className="text-[11px] text-emerald-400 font-medium">Se usarán sus datos de perfil automáticamente.</p>
                      </div>
                    )}
                  </div>

                  {errorMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-xs font-medium"
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {errorMsg}
                    </motion.div>
                  )}

                  {formData.id_lugar_produccion && lockedLugares.includes(Number(formData.id_lugar_produccion)) && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-xs font-medium animate-pulse"
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      Este Lugar de Producción tiene una inspección activa. No se pueden registrar nuevos predios.
                    </motion.div>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-slate-800">
                    <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1 h-14 rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white font-bold transition-colors">
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSaving || (!!formData.id_lugar_produccion && lockedLugares.includes(Number(formData.id_lugar_produccion)))}
                      className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                    >
                      {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "GUARDAR REGISTRO"}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

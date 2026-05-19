"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  Sprout,
  Layers,
  Calendar,
  X,
  Loader2,
  TreePine,
  MapPin,
  Flag,
  ArrowRight,
  TrendingUp,
  History,
  ExternalLink,
  Trash2
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { useUserStore } from "@/lib/store"

interface Siembra {
  id_siembra: number
  fecha_siembra: string
  cantidad_plantas: number
  id_lote: number
  fecha_fin?: string
  nombre_lote?: string // Added for detail view
  nombre_lugar?: string // Added for detail view
  area?: number // Added for detail view
  variedad: {
    nombre_variedad: string
    especie: {
      nombre_comun: string
    }
  }
}

interface Lote {
  id_lote: number
  nombre_lote: string
  area?: number
  estado: string
  id_lugar_produccion: number
}

interface LugarProduccion {
  id_lugar_produccion: number
  nombre_lugar: string
  lote: Lote[]
}

export default function SiembrasPage() {
  const [siembras, setSiembras] = useState<Siembra[]>([])
  const [predios, setPredios] = useState<any[]>([])
  const [especies, setEspecies] = useState<any[]>([])
  const [variedades, setVariedades] = useState<any[]>([])
  const [lockedLugares, setLockedLugares] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const { user, selectedPredioId, setSelectedPredioId } = useUserStore()
  const router = useRouter()

  // 🛡️ Protección de Ruta por Roles
  useEffect(() => {
    if (user && user.role !== "productor") {
      router.push("/dashboard")
    }
  }, [user, router])

  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null)
  const [selectedSiembra, setSelectedSiembra] = useState<Siembra | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [isManualEspecie, setIsManualEspecie] = useState(false)
  const [isManualVariedad, setIsManualVariedad] = useState(false)

  const [formData, setFormData] = useState({
    id_predio: "", nombre_lote: "", area_lote: "",
    id_especie: "", id_variedad: "",
    nombre_especie_manual: "", nombre_variedad_manual: "",
    ciclo_manual: "corto", // Default value
    fecha_siembra: new Date().toISOString().split('T')[0],
    cantidad_plantas: "100"
  })

  // Si cargan los predios y no hay un predio seleccionado globalmente, seleccionamos el primero por defecto
  useEffect(() => {
    if (predios.length > 0 && !selectedPredioId) {
      setSelectedPredioId(predios[0].id_predio.toString())
    }
  }, [predios, selectedPredioId, setSelectedPredioId])

  // Preseleccionar predio en formulario de registro
  useEffect(() => {
    if (showRegisterModal && selectedPredioId) {
      setFormData(prev => ({ ...prev, id_predio: selectedPredioId }))
    }
  }, [showRegisterModal, selectedPredioId])

  const lotesConEstado = useMemo(() => {
    const allLotes: (Lote & { nombre_predio: string, id_predio: number, siembraActiva?: Siembra })[] = []
    predios.forEach(predio => {
      // Filtrar por predio activo si hay alguno seleccionado
      if (selectedPredioId && predio.id_predio.toString() !== selectedPredioId) return;

      predio.lote?.forEach((lote: any) => {
        // Ignorar los lotes que han sido "eliminados" (borrado lógico)
        if (lote.estado === 'inactivo') return;

        const siembraActiva = siembras.find(s => {
          const matchLote = Number(s.id_lote) === Number(lote.id_lote);
          const isActive = !s.fecha_fin || s.fecha_fin === "" || s.fecha_fin === null;
          return matchLote && isActive;
        });
        allLotes.push({ ...lote, nombre_predio: predio.nombre_predio, id_predio: predio.id_predio, siembraActiva, id_lugar_produccion: predio.id_lugar_produccion })
      })
    })
    return allLotes
  }, [predios, siembras, selectedPredioId])

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      const [siembrasRes, prediosRes, especiesRes] = await Promise.all([
        api.get("/cultivos/siembras"),
        api.get("/predios/list"),
        api.get("/cultivos/catalogos/especies")
      ])
      setSiembras(siembrasRes.data)
      setPredios(prediosRes.data)
      setEspecies(especiesRes.data)

      // 🔒 Cargar inspecciones activas para bloquear lotes/siembras
      try {
        const resInspecciones = await api.get("/inspecciones/reporte")
        const activeInsps = (resInspecciones.data || []).filter(
          (ins: any) => ins.estado === "programada" || ins.estado === "en_proceso"
        )
        const lockedIds = activeInsps.map((ins: any) => Number(ins.id_predio)).filter(Boolean)
        setLockedLugares(lockedIds)
      } catch (err) {
        console.error("⚠️ Error cargando inspecciones activas para bloqueo:", err)
      }
    } finally {
      setLoading(false)
    }
  }

  const toTitleCase = (str: string) => {
    return str.trim().toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  useEffect(() => {
    if (formData.id_especie && formData.id_especie !== 'manual') {
      api.get(`/cultivos/catalogos/variedades?id_especie=${formData.id_especie}`).then(res => setVariedades(res.data))
    } else {
      setVariedades([])
    }
  }, [formData.id_especie])

  const resolveIds = async () => {
    let finalEspecieId = formData.id_especie;
    let finalVariedadId = formData.id_variedad;

    // 1. Resolver Especie Manual
    if (isManualEspecie) {
      const res = await api.post("/cultivos/catalogos/especies", {
        nombre_comun: toTitleCase(formData.nombre_especie_manual),
        ciclo: formData.ciclo_manual
      });
      finalEspecieId = res.data.id_especie;
    }

    // 2. Resolver Variedad Manual
    if (isManualVariedad) {
      const res = await api.post("/cultivos/catalogos/variedades", {
        id_especie: Number(finalEspecieId),
        nombre_variedad: toTitleCase(formData.nombre_variedad_manual)
      });
      finalVariedadId = res.data.id_variedad;
    }

    return { finalEspecieId, finalVariedadId };
  }

  const handleRegisterNew = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const { finalVariedadId } = await resolveIds();

      const loteRes = await api.post("/predios/lotes", {
        nombre_lote: formData.nombre_lote, area: Number(formData.area_lote), id_predio: Number(formData.id_predio)
      })
      await api.post("/cultivos/siembras", {
        fecha_siembra: formData.fecha_siembra, id_variedad: Number(finalVariedadId), cantidad_plantas: Number(formData.cantidad_plantas), id_lote: loteRes.data.id_lote
      })

      // Actualización optimista: agregar el lote con la siembra activa ya incluida
      const nuevoLote = {
        ...loteRes.data,
        estado: 'ocupado',
        siembraActiva: {
          id_lote: loteRes.data.id_lote,
          cantidad_plantas: Number(formData.cantidad_plantas),
          fecha_siembra: formData.fecha_siembra,
          fecha_fin: null,
          variedad: variedades.find(v => v.id_variedad === Number(formData.id_variedad)) || { nombre_variedad: formData.nombre_variedad_manual || 'Nueva siembra' }
        }
      };
      setPredios(prev => prev.map(p => (
        p.id_predio === Number(formData.id_predio)
          ? { ...p, lote: [...(p.lote || []), nuevoLote] }
          : p
      )));

      resetAndClose();
      refetchWithRetry();
    } catch (err) {
      alert("Error al registrar: " + ((err as any).response?.data?.error || "Error desconocido"));
    } finally { setIsSaving(false) }
  }

  const handleAssignToExisting = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLote) return
    setIsSaving(true)
    try {
      const { finalVariedadId } = await resolveIds();

      await api.post("/cultivos/siembras", {
        fecha_siembra: formData.fecha_siembra, id_variedad: Number(finalVariedadId), cantidad_plantas: Number(formData.cantidad_plantas), id_lote: selectedLote.id_lote
      })

      // Actualización optimista: marcar el lote como ocupado con la nueva siembra
      const nuevaSiembra = {
        id_lote: selectedLote.id_lote,
        cantidad_plantas: Number(formData.cantidad_plantas),
        fecha_siembra: formData.fecha_siembra,
        fecha_fin: null,
        variedad: variedades.find(v => v.id_variedad === Number(formData.id_variedad)) || { nombre_variedad: formData.nombre_variedad_manual || 'Nueva siembra' }
      };
      setPredios(prev => prev.map(p => ({
        ...p,
        lote: p.lote?.map((l: any) => l.id_lote === selectedLote.id_lote
          ? { ...l, estado: 'ocupado', siembraActiva: nuevaSiembra }
          : l
        )
      })));

      resetAndClose();
      refetchWithRetry();
    } catch (err) {
      alert("Error al registrar siembra: " + ((err as any).response?.data?.error || "Error desconocido"));
    } finally { setIsSaving(false) }
  }

  // Re-fetch con reintentos para tolerar el lag de RabbitMQ
  const refetchWithRetry = async () => {
    await fetchInitialData()           // Intento inmediato
    setTimeout(() => fetchInitialData(), 1500)  // Reintento 1.5s
    setTimeout(() => fetchInitialData(), 4000)  // Reintento final 4s
  }

  const resetAndClose = () => {
    setShowRegisterModal(false)
    setShowAssignModal(false)
    setIsManualEspecie(false)
    setIsManualVariedad(false)
    setFormData({
      id_predio: "", nombre_lote: "", area_lote: "",
      id_especie: "", id_variedad: "",
      nombre_especie_manual: "", nombre_variedad_manual: "",
      ciclo_manual: "corto",
      fecha_siembra: new Date().toISOString().split('T')[0],
      cantidad_plantas: "100"
    })
  }

  const handleFinalizarCiclo = async (id: number) => {
    if (!confirm("¿Finalizar ciclo? El lote quedará marcado como DISPONIBLE.")) return
    setIsSaving(true)
    try {
      await api.patch(`/cultivos/siembras/${id}/finalizar`, { fecha_fin: new Date().toISOString().split('T')[0] })

      setSelectedSiembra(null);
      // Forzar estado disponible localmente y limpiar siembraActiva mientras RabbitMQ procesa
      setPredios(prev => prev.map(p => ({
        ...p,
        lote: p.lote?.map((l: any) => l.siembraActiva?.id_siembra === id
          ? { ...l, estado: 'disponible', siembraActiva: undefined }
          : l
        )
      })));
      setSiembras(prev => prev.map(s => s.id_siembra === id
        ? { ...s, fecha_fin: new Date().toISOString().split('T')[0] }
        : s
      ));

      refetchWithRetry();
    } catch (error) {
      alert("Error al finalizar ciclo");
    } finally { setIsSaving(false) }
  }

  const handleDeleteLote = async (id: number) => {
    if (!confirm("⚠️ ¡ADVERTENCIA! ¿Estás seguro de que deseas eliminar este lote de forma permanente? Esto no se puede deshacer.")) return
    setIsSaving(true)
    try {
      await api.delete(`/predios/lotes/${id}`)
      setPredios(prev => prev.map(p => ({
        ...p,
        lote: p.lote?.filter((l: any) => l.id_lote !== id)
      })));
    } catch (error) {
      alert("Error al eliminar el lote");
    } finally { setIsSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-12 h-12 text-teal-500 animate-spin" /></div>

  return (
    <div className="space-y-8 pb-20 font-sans" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Cabecera */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-slate-800 pb-6 gap-4">
        <div>
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
            <Sprout className="text-teal-500 w-10 h-10" />
            Control de Activos
          </h1>
          <p className="text-slate-500 mt-1 font-bold text-xs uppercase tracking-widest">Lotes • Disponibilidad • Producción</p>
        </div>
        <Button onClick={() => setShowRegisterModal(true)} className="bg-teal-600 hover:bg-teal-500 text-white font-black h-14 px-8 rounded-2xl shadow-xl shadow-teal-900/20 transition-all">
          <Plus className="w-6 h-6 mr-2" /> NUEVO LOTE
        </Button>
      </div>

      {/* Selector de Predio para Filtrado Real */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-6 rounded-[2rem] border border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <MapPin className="text-teal-500 w-5 h-5 shrink-0" />
          <span className="text-sm font-black text-slate-300 uppercase tracking-widest italic">Filtrar por Predio</span>
        </div>
        <select
          value={selectedPredioId || ""}
          onChange={(e) => setSelectedPredioId(e.target.value || null)}
          className="w-full sm:w-80 bg-slate-950 border-2 border-slate-800 rounded-2xl py-3 px-4 text-white focus:border-teal-500 outline-none transition-all text-sm font-bold appearance-none cursor-pointer h-12"
        >
          <option value="">Mostrar Todos los Predios ({predios.length})</option>
          {predios.map((p) => (
            <option key={p.id_predio} value={p.id_predio.toString()}>
              {p.nombre_predio} ({p.lugar_produccion?.nombre_lugar || "Lugar no definido"})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lotesConEstado.map((lote, idx) => {
          const isLocked = lockedLugares.includes(Number(lote.id_predio))
          return (
            <motion.div key={lote.id_lote} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}
              onClick={() => lote.estado === 'ocupado' && lote.siembraActiva && setSelectedSiembra({ ...lote.siembraActiva, nombre_lote: lote.nombre_lote, nombre_lugar: lote.nombre_predio, area: lote.area, id_predio: lote.id_predio, id_lugar_produccion: lote.id_lugar_produccion } as any)}
              className="cursor-pointer select-none"
            >
              <Card className={`relative overflow-hidden transition-all border-2 ${lote.estado === 'ocupado' ? 'bg-slate-900/50 border-slate-800 hover:border-teal-500' : 'bg-slate-950/40 border-slate-900 border-dashed hover:border-slate-700'}`}>
                <CardContent className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${lote.siembraActiva ? 'bg-teal-500/10' : 'bg-slate-800'}`}>
                        <Layers className={`${lote.siembraActiva ? 'text-teal-500' : 'text-slate-600'} w-7 h-7`} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">{lote.nombre_lote}</h3>
                        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {lote.nombre_predio}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {isLocked && (
                        <span className="px-2.5 py-0.5 text-[8px] font-black uppercase rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
                          Congelado
                        </span>
                      )}
                      <span className={`px-3 py-1 text-[9px] font-black uppercase rounded-full border ${lote.estado === 'ocupado' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                        {lote.estado === 'ocupado' ? 'Lote Ocupado' : 'Lote Disponible'}
                      </span>
                    </div>
                  </div>

                  {lote.estado === 'ocupado' ? (
                    <div className="space-y-6">
                      {/* Sección Cultivo */}
                      <div className="py-6 border-y border-slate-800/50 flex justify-between items-end">
                        <div>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-2">Cultivo Actual</p>
                          <p className="text-3xl font-black text-emerald-500 uppercase italic leading-none mb-2">
                            {lote.siembraActiva?.variedad?.especie?.nombre_comun || 'Cargando...'}
                          </p>
                          <p className="text-sm font-bold text-white uppercase tracking-tight">
                            Variedad: <span className="text-slate-400">{lote.siembraActiva?.variedad?.nombre_variedad || 'N/A'}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Siembra</p>
                          <p className="text-white font-bold text-sm">
                            {lote.siembraActiva?.fecha_siembra
                              ? new Date(lote.siembraActiva.fecha_siembra).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '---'}
                          </p>
                        </div>
                      </div>

                      {/* Sección Métricas */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-950/30 rounded-2xl border border-slate-800/50 text-left">
                          <p className="text-2xl font-black text-white italic leading-none mb-1">{lote.area || 0} m²</p>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Área del lote</p>
                        </div>
                        <div className="p-4 bg-slate-950/30 rounded-2xl border border-slate-800/50 text-left">
                          <p className="text-2xl font-black text-white italic leading-none mb-1">{lote.siembraActiva?.cantidad_plantas || 0}</p>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Plantas sembradas</p>
                        </div>
                      </div>

                      {/* Acción Principal */}
                      <div className="pt-2">
                        <Button
                          className="w-full bg-slate-900 hover:bg-teal-600 text-white border border-slate-800 hover:border-teal-500 rounded-2xl font-black text-sm uppercase tracking-widest h-14 transition-all group/btn shadow-xl"
                        >
                          <TrendingUp className="w-5 h-5 mr-3 text-teal-500 group-hover/btn:text-white" />
                          Gestionar cultivo
                          <ExternalLink className="w-4 h-4 ml-2 opacity-50 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-6 border-t border-slate-900 space-y-3">
                      <Button
                        disabled={isLocked}
                        onClick={(e) => { e.stopPropagation(); setSelectedLote(lote); setShowAssignModal(true); }}
                        className={`w-full bg-slate-900 hover:bg-emerald-600 text-slate-500 hover:text-white font-black text-xs tracking-widest h-14 rounded-2xl transition-all border border-slate-800 uppercase shadow-lg ${isLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        {isLocked ? '🔒 Asignación Bloqueada' : 'Asignar Nueva Siembra'}
                      </Button>
                      <Button
                        disabled={isLocked}
                        onClick={(e) => { e.stopPropagation(); handleDeleteLote(lote.id_lote); }}
                        className={`w-full bg-slate-950 hover:bg-red-900/30 text-red-500/50 hover:text-red-500 font-bold text-xs tracking-widest h-12 rounded-2xl transition-all border border-slate-800/50 hover:border-red-500/30 uppercase ${isLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Eliminar Lote
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* MODAL DE DETALLE */}
      <AnimatePresence>
        {selectedSiembra && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/95 backdrop-blur-md" onClick={() => setSelectedSiembra(null)} />
            <motion.div initial={{ opacity: 0.8, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0.8, scale: 0.95 }} className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">GESTIÓN DE CICLO</h2>
                <button onClick={() => setSelectedSiembra(null)} className="p-2 bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-950/50 p-6 rounded-[1.5rem] border border-slate-800 mb-6 space-y-6 text-left">
                <div>
                  <p className="text-sm text-teal-500 font-black uppercase mb-4 tracking-[0.2em] flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Predio y Lote
                  </p>
                  <div className="space-y-4">
                    <div>
                      <p className="text-slate-500 text-xs font-black uppercase mb-1">Nombre del Predio</p>
                      <p className="text-white font-black text-2xl uppercase italic tracking-tighter leading-none">{selectedSiembra.nombre_lote ? lotesConEstado.find(l => l.id_lote === selectedSiembra.id_lote)?.nombre_predio : 'N/A'}</p>
                    </div>
                    <div className="flex justify-between items-end gap-4 border-t border-slate-800/30 pt-4">
                      <div>
                        <p className="text-slate-500 text-xs font-black uppercase mb-1">Nombre Lote</p>
                        <p className="text-white font-black text-xl uppercase italic tracking-widest leading-none">{selectedSiembra.nombre_lote}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-500 text-xs font-black uppercase mb-1">Área Del Lote</p>
                        <p className="text-white font-black text-xl italic leading-none">{selectedSiembra.area} <span className="text-xs text-slate-500 uppercase not-italic font-black ml-1">m²</span></p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 py-6 border-y border-slate-800/50">
                  <div>
                    <p className="text-xs text-teal-500 font-black uppercase mb-2 tracking-widest">Especie</p>
                    <p className="text-white font-black text-xl uppercase italic leading-none">{selectedSiembra.variedad?.especie?.nombre_comun || 'No definida'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-teal-500 font-black uppercase mb-2 tracking-widest">Variedad</p>
                    <p className="text-white font-black text-xl uppercase italic leading-none">{selectedSiembra.variedad?.nombre_variedad}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-xs text-teal-500 font-black uppercase tracking-widest flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Fecha Siembra
                    </p>
                    <p className="text-white font-black text-base italic uppercase">{new Date(selectedSiembra.fecha_siembra).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-xs text-teal-500 font-black uppercase tracking-widest flex items-center gap-2 justify-end">
                      <TreePine className="w-4 h-4" /> Cantidad De Plantas
                    </p>
                    <p className="text-white font-black text-2xl italic leading-none">{selectedSiembra.cantidad_plantas} <span className="text-xs text-slate-500 uppercase not-italic font-black ml-1">Unidades</span></p>
                  </div>
                </div>
              </div>
              {selectedSiembra && lockedLugares.includes(Number((selectedSiembra as any).id_predio)) && (
                <p className="text-rose-400 text-xs font-bold text-center mb-4 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                  Este ciclo no se puede finalizar porque el predio está en inspección activa.
                </p>
              )}
              <Button
                onClick={() => handleFinalizarCiclo(selectedSiembra.id_siembra)}
                disabled={isSaving || (selectedSiembra && lockedLugares.includes(Number((selectedSiembra as any).id_predio)))}
                className="w-full h-16 bg-rose-600 hover:bg-rose-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-rose-900/40 transition-all hover:scale-[1.01] active:scale-95 flex flex-col gap-0 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>FINALIZAR CICLO</span>
                <span className="text-[10px] opacity-60">LIBERAR LOTE PARA NUEVA PRODUCCIÓN</span>
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ASIGNAR SIEMBRA A LOTE EXISTENTE */}
      <AnimatePresence>
        {showAssignModal && selectedLote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-left">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/95 backdrop-blur-md" onClick={() => !isSaving && setShowAssignModal(false)} />
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-[3rem] p-10 overflow-y-auto max-h-[90vh]">
              <h2 className="text-3xl font-black text-white italic mb-2 tracking-tighter uppercase">ASIGNAR CULTIVO</h2>
              <p className="text-teal-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-10">Reutilización de Lote: {selectedLote.nombre_lote}</p>
              <form onSubmit={handleAssignToExisting} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Especie */}
                  {!isManualEspecie ? (
                    <select required className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-teal-500 transition-all text-sm"
                      value={formData.id_especie}
                      onChange={(e) => {
                        if (e.target.value === 'manual') {
                          setIsManualEspecie(true);
                          setIsManualVariedad(true); // Si la especie es nueva, la variedad también debe serlo
                          setFormData({ ...formData, id_especie: 'manual', id_variedad: 'manual' })
                        } else {
                          setFormData({ ...formData, id_especie: e.target.value, id_variedad: "" })
                        }
                      }}>
                      <option value="">Especie...</option>
                      {especies.map(e => <option key={e.id_especie} value={e.id_especie}>{e.nombre_comun}</option>)}
                      <option value="manual" className="text-teal-500 font-black italic">+ AGREGAR NUEVA...</option>
                    </select>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <input required className="w-full bg-slate-950 border-2 border-teal-500/50 p-4 rounded-2xl text-white font-bold outline-none text-sm placeholder:text-slate-700"
                          placeholder="Nombre Nueva Especie"
                          value={formData.nombre_especie_manual}
                          onChange={(e) => setFormData({ ...formData, nombre_especie_manual: e.target.value })}
                        />
                        <button type="button" onClick={() => { setIsManualEspecie(false); setFormData({ ...formData, id_especie: "" }) }} className="absolute -top-2 -right-2 bg-slate-800 text-white p-1 rounded-full"><X className="w-3 h-3" /></button>
                      </div>
                      <select required className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white text-[10px] font-black uppercase outline-none focus:border-teal-500"
                        value={formData.ciclo_manual}
                        onChange={(e) => setFormData({ ...formData, ciclo_manual: e.target.value })}>
                        <option value="corto">Ciclo Corto</option>
                        <option value="mediano">Ciclo Mediano</option>
                        <option value="largo">Ciclo Largo</option>
                      </select>
                    </div>
                  )}

                  {/* Variedad */}
                  {!isManualVariedad ? (
                    <select required disabled={!formData.id_especie || formData.id_especie === 'manual'} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-teal-500 transition-all text-sm disabled:opacity-20"
                      value={formData.id_variedad}
                      onChange={(e) => {
                        if (e.target.value === 'manual') {
                          setIsManualVariedad(true);
                          setFormData({ ...formData, id_variedad: 'manual' })
                        } else {
                          setFormData({ ...formData, id_variedad: e.target.value })
                        }
                      }}>
                      <option value="">Variedad...</option>
                      {variedades.map(v => <option key={v.id_variedad} value={v.id_variedad}>{v.nombre_variedad}</option>)}
                      <option value="manual" className="text-teal-500 font-black italic">+ AGREGAR NUEVA...</option>
                    </select>
                  ) : (
                    <div className="relative">
                      <input required className="w-full bg-slate-950 border-2 border-teal-500/50 p-4 rounded-2xl text-white font-bold outline-none text-sm placeholder:text-slate-700"
                        placeholder="Nombre Nueva Variedad"
                        value={formData.nombre_variedad_manual}
                        onChange={(e) => setFormData({ ...formData, nombre_variedad_manual: e.target.value })}
                      />
                      <button type="button" onClick={() => { setIsManualVariedad(false); setFormData({ ...formData, id_variedad: "" }) }} className="absolute -top-2 -right-2 bg-slate-800 text-white p-1 rounded-full"><X className="w-3 h-3" /></button>
                    </div>
                  )}

                  <input required type="number" className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-bold text-sm focus:border-teal-500 outline-none" placeholder="Población" value={formData.cantidad_plantas} onChange={(e) => setFormData({ ...formData, cantidad_plantas: e.target.value })} />
                </div>
                <Button
                  disabled={isSaving || (selectedLote && lockedLugares.includes(Number((selectedLote as any).id_predio)))}
                  className="w-full h-16 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-900/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? "PROCESANDO..." : "REACTIVAR LOTE CON SIEMBRA"}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: REGISTRAR LOTE TOTALMENTE NUEVO */}
      <AnimatePresence>
        {showRegisterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/95 backdrop-blur-md" onClick={() => !isSaving && setShowRegisterModal(false)} />
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-[3rem] p-10 overflow-y-auto max-h-[90vh]">
              <h2 className="text-3xl font-black text-white italic mb-10 tracking-tighter uppercase">NUEVO LOTE</h2>
              <form onSubmit={handleRegisterNew} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select required className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-teal-500 text-sm animate-all" value={formData.id_predio} onChange={(e) => setFormData({ ...formData, id_predio: e.target.value })}>
                    <option value="">Seleccionar Predio...</option>
                    {predios.map(p => <option key={p.id_predio} value={p.id_predio}>{p.nombre_predio}</option>)}
                  </select>
                  <input required className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-bold text-sm focus:border-teal-500 outline-none" placeholder="Nombre Lote" value={formData.nombre_lote} onChange={(e) => setFormData({ ...formData, nombre_lote: e.target.value })} />
                  <input required type="number" className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-bold text-sm focus:border-teal-500 outline-none" placeholder="Área (m²)" value={formData.area_lote} onChange={(e) => setFormData({ ...formData, area_lote: e.target.value })} />
                </div>
                {formData.id_predio && lockedLugares.includes(Number(formData.id_predio)) && (
                  <div className="p-4.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-sm font-bold animate-pulse">
                    Este predio tiene una inspección programada o en curso. Creación de lotes bloqueada.
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                  {/* Especie */}
                  {!isManualEspecie ? (
                    <select required className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-teal-500 text-sm"
                      value={formData.id_especie}
                      onChange={(e) => {
                        if (e.target.value === 'manual') {
                          setIsManualEspecie(true);
                          setIsManualVariedad(true);
                          setFormData({ ...formData, id_especie: 'manual', id_variedad: 'manual' })
                        } else {
                          setFormData({ ...formData, id_especie: e.target.value, id_variedad: "" })
                        }
                      }}>
                      <option value="">Especie...</option>
                      {especies.map(e => <option key={e.id_especie} value={e.id_especie}>{e.nombre_comun}</option>)}
                      <option value="manual" className="text-teal-500 font-black italic">+ AGREGAR NUEVA...</option>
                    </select>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <input required className="w-full bg-slate-950 border-2 border-teal-500/50 p-4 rounded-2xl text-white font-bold outline-none text-sm placeholder:text-slate-700"
                          placeholder="Nombre Nueva Especie"
                          value={formData.nombre_especie_manual}
                          onChange={(e) => setFormData({ ...formData, nombre_especie_manual: e.target.value })}
                        />
                        <button type="button" onClick={() => { setIsManualEspecie(false); setFormData({ ...formData, id_especie: "" }) }} className="absolute -top-2 -right-2 bg-slate-800 text-white p-1 rounded-full"><X className="w-3 h-3" /></button>
                      </div>
                      <select required className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white text-[10px] font-black uppercase outline-none focus:border-teal-500"
                        value={formData.ciclo_manual}
                        onChange={(e) => setFormData({ ...formData, ciclo_manual: e.target.value })}>
                        <option value="corto">Ciclo Corto</option>
                        <option value="mediano">Ciclo Mediano</option>
                        <option value="largo">Ciclo Largo</option>
                      </select>
                    </div>
                  )}

                  {/* Variedad */}
                  {!isManualVariedad ? (
                    <select required disabled={!formData.id_especie || formData.id_especie === 'manual'} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-teal-500 disabled:opacity-20 text-sm"
                      value={formData.id_variedad}
                      onChange={(e) => {
                        if (e.target.value === 'manual') {
                          setIsManualVariedad(true);
                          setFormData({ ...formData, id_variedad: 'manual' })
                        } else {
                          setFormData({ ...formData, id_variedad: e.target.value })
                        }
                      }}>
                      <option value="">Variedad...</option>
                      {variedades.map(v => <option key={v.id_variedad} value={v.id_variedad}>{v.nombre_variedad}</option>)}
                      <option value="manual" className="text-teal-500 font-black italic">+ AGREGAR NUEVA...</option>
                    </select>
                  ) : (
                    <div className="relative">
                      <input required className="w-full bg-slate-950 border-2 border-teal-500/50 p-4 rounded-2xl text-white font-bold outline-none text-sm placeholder:text-slate-700"
                        placeholder="Nombre Nueva Variedad"
                        value={formData.nombre_variedad_manual}
                        onChange={(e) => setFormData({ ...formData, nombre_variedad_manual: e.target.value })}
                      />
                      <button type="button" onClick={() => { setIsManualVariedad(false); setFormData({ ...formData, id_variedad: "" }) }} className="absolute -top-2 -right-2 bg-slate-800 text-white p-1 rounded-full"><X className="w-3 h-3" /></button>
                    </div>
                  )}

                  <input required type="date" className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-mono text-sm focus:border-teal-500" value={formData.fecha_siembra} onChange={(e) => setFormData({ ...formData, fecha_siembra: e.target.value })} />
                  <input required type="number" className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-bold text-sm focus:border-teal-500" placeholder="Población" value={formData.cantidad_plantas} onChange={(e) => setFormData({ ...formData, cantidad_plantas: e.target.value })} />
                </div>
                <Button
                  disabled={isSaving || !!(formData.id_predio && lockedLugares.includes(Number(formData.id_predio)))}
                  className="w-full h-16 bg-teal-600 hover:bg-teal-500 text-white font-black text-xl rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? "GUARDANDO CATÁLOGOS..." : "REGISTRAR LOTE Y SIEMBRA"}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

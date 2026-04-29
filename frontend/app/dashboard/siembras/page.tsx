"use client"

import { useEffect, useState, useMemo } from "react"
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
  History
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"

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
  const [lugares, setLugares] = useState<LugarProduccion[]>([])
  const [especies, setEspecies] = useState<any[]>([])
  const [variedades, setVariedades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null)
  const [selectedSiembra, setSelectedSiembra] = useState<Siembra | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  const [isManualEspecie, setIsManualEspecie] = useState(false)
  const [isManualVariedad, setIsManualVariedad] = useState(false)

  const [formData, setFormData] = useState({
    id_lugar_produccion: "", nombre_lote: "", area_lote: "",
    id_especie: "", id_variedad: "",
    nombre_especie_manual: "", nombre_variedad_manual: "",
    ciclo_manual: "corto", // Default value
    fecha_siembra: new Date().toISOString().split('T')[0],
    cantidad_plantas: "100"
  })

  const lotesConEstado = useMemo(() => {
    const allLotes: (Lote & { nombre_lugar: string, siembraActiva?: Siembra })[] = []
    lugares.forEach(lugar => {
      lugar.lote?.forEach(lote => {
        const siembraActiva = siembras.find(s => s.id_lote === lote.id_lote && !s.fecha_fin)
        allLotes.push({ ...lote, nombre_lugar: lugar.nombre_lugar, siembraActiva })
      })
    })
    return allLotes
  }, [lugares, siembras])

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      const [siembrasRes, lugaresRes, especiesRes] = await Promise.all([
        api.get("/cultivos/siembras"),
        api.get("/predios/lugares-produccion"),
        api.get("/cultivos/catalogos/especies")
      ])
      setSiembras(siembrasRes.data)
      setLugares(lugaresRes.data)
      setEspecies(especiesRes.data)
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
        nombre_lote: formData.nombre_lote, area_m2: Number(formData.area_lote), id_lugar_produccion: Number(formData.id_lugar_produccion)
      })
      await api.post("/cultivos/siembras", {
        fecha_siembra: formData.fecha_siembra, id_variedad: Number(finalVariedadId), cantidad_plantas: Number(formData.cantidad_plantas), id_lote: loteRes.data.id_lote
      })
      resetAndClose();
    } catch (err) {
      alert("Error al registrar: " + (err as any).response?.data?.error || "Error desconocido");
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
      resetAndClose();
    } catch (err) {
      alert("Error al registrar siembra: " + (err as any).response?.data?.error || "Error desconocido");
    } finally { setIsSaving(false) }
  }

  const resetAndClose = async () => {
    setShowRegisterModal(false)
    setShowAssignModal(false)
    setIsManualEspecie(false)
    setIsManualVariedad(false)
    setFormData({
      id_lugar_produccion: "", nombre_lote: "", area_lote: "",
      id_especie: "", id_variedad: "",
      nombre_especie_manual: "", nombre_variedad_manual: "",
      ciclo_manual: "corto",
      fecha_siembra: new Date().toISOString().split('T')[0],
      cantidad_plantas: "100"
    })
    await fetchInitialData()
  }

  const handleFinalizarCiclo = async (id: number) => {
    if (!confirm("¿Finalizar ciclo? El lote quedará marcado como DISPONIBLE.")) return
    setIsSaving(true)
    try {
      await api.patch(`/cultivos/siembras/${id}/finalizar`, { fecha_fin: new Date().toISOString().split('T')[0] })
      setSelectedSiembra(null); await fetchInitialData()
    } finally { setIsSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-12 h-12 text-teal-500 animate-spin" /></div>

  return (
    <div className="space-y-8 pb-20 font-sans" style={{ fontFamily: 'Outfit, sans-serif' }}>
      
      {/* Cabecera */}
      <div className="flex justify-between items-end border-b-2 border-slate-800 pb-6">
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

      {/* Grid de Activos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lotesConEstado.map((lote, idx) => (
          <motion.div key={lote.id_lote} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }} 
            onClick={() => lote.siembraActiva && setSelectedSiembra({ ...lote.siembraActiva, nombre_lote: lote.nombre_lote, nombre_lugar: lote.nombre_lugar, area: lote.area })}
            className="cursor-pointer select-none"
          >
            <Card className={`relative overflow-hidden transition-all border-2 ${lote.siembraActiva ? 'bg-slate-900/50 border-slate-800 hover:border-teal-500' : 'bg-slate-950/40 border-slate-900 border-dashed hover:border-slate-700'}`}>
              <CardContent className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${lote.siembraActiva ? 'bg-teal-500/10' : 'bg-slate-800'}`}>
                    <Layers className={`${lote.siembraActiva ? 'text-teal-500' : 'text-slate-600'} w-7 h-7`} />
                  </div>
                  <span className={`px-3 py-1 text-[9px] font-black uppercase rounded-full border ${lote.siembraActiva ? 'bg-teal-500/10 text-teal-500 border-teal-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                    {lote.siembraActiva ? 'Lote Ocupado' : 'Lote Disponible'}
                  </span>
                </div>

                <div className="mb-8">
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">{lote.nombre_lote}</h3>
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1 italic">{lote.nombre_lugar}</p>
                </div>

                {lote.siembraActiva ? (
                  <div className="space-y-4 pt-6 border-t border-slate-800">
                     <div className="flex items-center gap-3">
                        <TrendingUp className="text-teal-500 w-5 h-5" />
                        <div>
                           <p className="text-[10px] text-slate-500 font-black uppercase">Cultivo Actual</p>
                           <p className="text-white font-bold text-sm uppercase">{lote.siembraActiva.variedad?.nombre_variedad}</p>
                        </div>
                     </div>
                  </div>
                ) : (
                  <div className="pt-6 border-t border-slate-900">
                    <Button 
                      onClick={(e) => { e.stopPropagation(); setSelectedLote(lote); setShowAssignModal(true); }}
                      className="w-full bg-slate-900 hover:bg-emerald-600 text-slate-500 hover:text-white font-black text-[10px] tracking-widest h-12 rounded-xl transition-all border border-slate-800 uppercase"
                    >
                      Asignar Nueva Siembra
                    </Button>
                  </div>
                )}
              </CardContent>
              {lote.siembraActiva && (
                <div className="absolute bottom-2 right-4 text-[9px] text-slate-600 font-black uppercase italic opacity-100 transition-opacity">Ver detalles</div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      {/* MODAL DE DETALLE */}
      <AnimatePresence>
        {selectedSiembra && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/95 backdrop-blur-md" onClick={() => setSelectedSiembra(null)} />
            <motion.div initial={{ opacity: 0.8, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0.8, scale: 0.95 }} className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-[3rem] p-10">
                <div className="flex justify-between items-center mb-8 italic">
                   <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">GESTIÓN DE CICLO</h2>
                   <button onClick={() => setSelectedSiembra(null)} className="p-3 bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="bg-slate-950/50 p-8 rounded-[2rem] border border-slate-800 mb-8 space-y-8 text-left">
                   <div>
                      <p className="text-xs text-teal-500 font-black uppercase mb-6 tracking-[0.2em] flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Lugar de Producción y Lote
                      </p>
                      <div className="space-y-6">
                        <div>
                          <p className="text-slate-500 text-[10px] font-black uppercase mb-1">Nombre Lugar de Producción</p>
                          <p className="text-white font-black text-2xl uppercase italic tracking-tighter">{selectedSiembra.nombre_lugar}</p>
                        </div>
                        <div className="flex justify-between items-end gap-4 border-t border-slate-800/30 pt-4">
                          <div>
                            <p className="text-slate-500 text-[10px] font-black uppercase mb-1">Nombre Lote</p>
                            <p className="text-white font-bold text-xl uppercase italic tracking-widest">{selectedSiembra.nombre_lote}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-slate-500 text-[10px] font-black uppercase mb-1">Área del Lote</p>
                            <p className="text-white font-bold text-xl italic">{selectedSiembra.area} <span className="text-[10px] text-slate-500 uppercase not-italic font-black">m²</span></p>
                          </div>
                        </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-8 py-6 border-y border-slate-800/50">
                      <div>
                        <p className="text-xs text-teal-500 font-black uppercase mb-2 tracking-widest">Nombre Especie</p>
                        <p className="text-white font-black text-xl uppercase italic">{selectedSiembra.variedad?.especie?.nombre_comun || 'No definida'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-teal-500 font-black uppercase mb-2 tracking-widest">Nombre Variedad</p>
                        <p className="text-white font-black text-xl uppercase italic">{selectedSiembra.variedad?.nombre_variedad}</p>
                      </div>
                   </div>

                   <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <p className="text-xs text-teal-500 font-black uppercase tracking-widest flex items-center gap-2">
                          <Calendar className="w-4 h-4" /> Fecha de Siembra
                        </p>
                        <p className="text-white font-bold text-lg italic uppercase">{new Date(selectedSiembra.fecha_siembra).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-xs text-teal-500 font-black uppercase tracking-widest flex items-center gap-2 justify-end">
                          <TreePine className="w-4 h-4" /> Cantidad Plantas
                        </p>
                        <p className="text-white font-black text-2xl italic">{selectedSiembra.cantidad_plantas} <span className="text-xs text-slate-500 uppercase not-italic font-bold">Unidades</span></p>
                      </div>
                   </div>
                </div>
                <Button onClick={() => handleFinalizarCiclo(selectedSiembra.id_siembra)} disabled={isSaving} className="w-full h-20 bg-rose-600 hover:bg-rose-500 text-white font-black text-xl rounded-3xl shadow-2xl shadow-rose-900/40 transition-all hover:scale-[1.02] active:scale-95 flex flex-col gap-0 group">
                   <span>FINALIZAR CICLO</span>
                   <span className="text-[10px] opacity-60 group-hover:opacity-100 transition-opacity">LIBERAR LOTE PARA NUEVA PRODUCCIÓN</span>
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
                            setFormData({...formData, id_especie: 'manual', id_variedad: 'manual'})
                          } else {
                            setFormData({...formData, id_especie: e.target.value, id_variedad: ""})
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
                            onChange={(e) => setFormData({...formData, nombre_especie_manual: e.target.value})}
                          />
                          <button type="button" onClick={() => {setIsManualEspecie(false); setFormData({...formData, id_especie: ""})}} className="absolute -top-2 -right-2 bg-slate-800 text-white p-1 rounded-full"><X className="w-3 h-3"/></button>
                        </div>
                        <select required className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white text-[10px] font-black uppercase outline-none focus:border-teal-500"
                          value={formData.ciclo_manual}
                          onChange={(e) => setFormData({...formData, ciclo_manual: e.target.value})}>
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
                            setFormData({...formData, id_variedad: 'manual'})
                          } else {
                            setFormData({...formData, id_variedad: e.target.value})
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
                          onChange={(e) => setFormData({...formData, nombre_variedad_manual: e.target.value})}
                        />
                        <button type="button" onClick={() => {setIsManualVariedad(false); setFormData({...formData, id_variedad: ""})}} className="absolute -top-2 -right-2 bg-slate-800 text-white p-1 rounded-full"><X className="w-3 h-3"/></button>
                      </div>
                    )}

                    <input required type="date" className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-mono text-sm focus:border-teal-500 outline-none" value={formData.fecha_siembra} onChange={(e) => setFormData({...formData, fecha_siembra: e.target.value})} />
                    <input required type="number" className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-bold text-sm focus:border-teal-500 outline-none" placeholder="Población" value={formData.cantidad_plantas} onChange={(e) => setFormData({...formData, cantidad_plantas: e.target.value})} />
                  </div>
                  <Button disabled={isSaving} className="w-full h-16 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-900/20 active:scale-95 transition-all">
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
                <h2 className="text-3xl font-black text-white italic mb-10 tracking-tighter uppercase">NUEVO LOTE ESTRATÉGICO</h2>
                <form onSubmit={handleRegisterNew} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select required className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-teal-500 text-sm" value={formData.id_lugar_produccion} onChange={(e) => setFormData({...formData, id_lugar_produccion: e.target.value})}>
                        <option value="">Lugar de Producción...</option>
                        {lugares.map(l => <option key={l.id_lugar_produccion} value={l.id_lugar_produccion}>{l.nombre_lugar}</option>)}
                    </select>
                    <input required className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-bold text-sm focus:border-teal-500 outline-none" placeholder="Nombre Lote" value={formData.nombre_lote} onChange={(e) => setFormData({...formData, nombre_lote: e.target.value})} />
                    <input required type="number" className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-bold text-sm focus:border-teal-500 outline-none" placeholder="Área (m²)" value={formData.area_lote} onChange={(e) => setFormData({...formData, area_lote: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                    {/* Especie */}
                    {!isManualEspecie ? (
                      <select required className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-teal-500 text-sm" 
                        value={formData.id_especie} 
                        onChange={(e) => {
                          if (e.target.value === 'manual') {
                            setIsManualEspecie(true);
                            setIsManualVariedad(true);
                            setFormData({...formData, id_especie: 'manual', id_variedad: 'manual'})
                          } else {
                            setFormData({...formData, id_especie: e.target.value, id_variedad: ""})
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
                            onChange={(e) => setFormData({...formData, nombre_especie_manual: e.target.value})}
                          />
                          <button type="button" onClick={() => {setIsManualEspecie(false); setFormData({...formData, id_especie: ""})}} className="absolute -top-2 -right-2 bg-slate-800 text-white p-1 rounded-full"><X className="w-3 h-3"/></button>
                        </div>
                        <select required className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white text-[10px] font-black uppercase outline-none focus:border-teal-500"
                          value={formData.ciclo_manual}
                          onChange={(e) => setFormData({...formData, ciclo_manual: e.target.value})}>
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
                            setFormData({...formData, id_variedad: 'manual'})
                          } else {
                            setFormData({...formData, id_variedad: e.target.value})
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
                          onChange={(e) => setFormData({...formData, nombre_variedad_manual: e.target.value})}
                        />
                        <button type="button" onClick={() => {setIsManualVariedad(false); setFormData({...formData, id_variedad: ""})}} className="absolute -top-2 -right-2 bg-slate-800 text-white p-1 rounded-full"><X className="w-3 h-3"/></button>
                      </div>
                    )}

                    <input required type="date" className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-mono text-sm focus:border-teal-500" value={formData.fecha_siembra} onChange={(e) => setFormData({...formData, fecha_siembra: e.target.value})} />
                    <input required type="number" className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-bold text-sm focus:border-teal-500" placeholder="Población" value={formData.cantidad_plantas} onChange={(e) => setFormData({...formData, cantidad_plantas: e.target.value})} />
                  </div>
                  <Button disabled={isSaving} className="w-full h-16 bg-teal-600 hover:bg-teal-500 text-white font-black text-xl rounded-2xl">
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

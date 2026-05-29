"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, BookOpen, Pencil, Search, Trash2, X } from "lucide-react"
import api from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Especie {
  id_especie: number
  nombre_comun: string
  ciclo: string
  variedad?: { count: number }[]
}

interface Variedad {
  id_variedad: number
  id_especie: number
  nombre_variedad: string
  especie?: { nombre_comun: string }
  siembra?: { count: number }[]
}

type Editing = { type: "especie"; item: Especie } | { type: "variedad"; item: Variedad } | null

export default function CatalogosPage() {
  const [tab, setTab] = useState<"especies" | "variedades">("especies")
  const [especies, setEspecies] = useState<Especie[]>([])
  const [variedades, setVariedades] = useState<Variedad[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<Editing>(null)
  const [nombre, setNombre] = useState("")
  const [ciclo, setCiclo] = useState("")

  const fetchData = async () => {
    setLoading(true)
    try {
      const [espRes, varRes] = await Promise.all([
        api.get("/cultivos/catalogos/especies"),
        api.get("/cultivos/catalogos/variedades")
      ])
      setEspecies(espRes.data || [])
      setVariedades(varRes.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const variedadesFiltradas = useMemo(() => {
    return variedades.filter((v) => v.nombre_variedad.toLowerCase().includes(search.toLowerCase()))
  }, [variedades, search])

  const variedadCount = (especie: Especie) => especie.variedad?.[0]?.count || 0
  const siembraCount = (variedad: Variedad) => variedad.siembra?.[0]?.count || 0
  const hasNameWarning = (name: string) => /[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s-]/.test(name) || name === name.toLowerCase()

  const openEdit = (item: Editing) => {
    setEditing(item)
    if (!item) return
    setNombre(item.type === "especie" ? item.item.nombre_comun : item.item.nombre_variedad)
    setCiclo(item.type === "especie" ? item.item.ciclo : "")
  }

  const saveEdit = async () => {
    if (!editing) return
    if (editing.type === "especie") {
      await api.patch(`/cultivos/catalogos/especies/${editing.item.id_especie}`, { nombre_comun: nombre, ciclo })
    } else {
      await api.patch(`/cultivos/catalogos/variedades/${editing.item.id_variedad}`, { nombre_variedad: nombre })
    }
    setEditing(null)
    fetchData()
  }

  const removeEspecie = async (item: Especie) => {
    if (variedadCount(item) > 0) return
    if (!confirm(`¿Eliminar la especie ${item.nombre_comun}? Esta acción no se puede deshacer.`)) return
    await api.delete(`/cultivos/catalogos/especies/${item.id_especie}`)
    fetchData()
  }

  const removeVariedad = async (item: Variedad) => {
    if (siembraCount(item) > 0) return
    if (!confirm(`¿Eliminar la variedad ${item.nombre_variedad}? Esta acción no se puede deshacer.`)) return
    await api.delete(`/cultivos/catalogos/variedades/${item.id_variedad}`)
    fetchData()
  }

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-2xl"><BookOpen className="w-7 h-7 text-primary" /></div>
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-foreground">Gestión de Catálogos</h1>
          <p className="text-muted-foreground text-sm">Normalización de especies y variedades del sistema.</p>
        </div>
      </div>

      <div className="flex bg-card p-1 rounded-2xl border border-border w-fit">
        {(["especies", "variedades"] as const).map((value) => (
          <button key={value} onClick={() => setTab(value)} className={`px-5 py-2 rounded-xl text-xs font-black uppercase transition-all ${tab === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {value === "especies" ? "Especies" : "Variedades"}
          </button>
        ))}
      </div>

      {tab === "variedades" && (
        <Card className="bg-card border-border rounded-3xl">
          <CardContent className="p-4 relative">
            <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar variedades y detectar duplicados..." className="w-full bg-background border border-border rounded-2xl py-3 pl-11 pr-4 text-sm text-foreground" />
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border rounded-3xl overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? <p className="p-8 text-muted-foreground">Cargando catálogos...</p> : tab === "especies" ? (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b border-border bg-background"><tr><th className="p-4 text-left">Nombre común</th><th className="p-4 text-left">Ciclo</th><th className="p-4 text-left">Variedades</th><th className="p-4 text-right">Acciones</th></tr></thead>
              <tbody className="divide-y divide-border">
                {especies.map((item) => (
                  <tr key={item.id_especie} className="hover:bg-background transition-colors">
                    <td className="p-4 font-bold text-foreground">{item.nombre_comun} {hasNameWarning(item.nombre_comun) && <Badge variant="outline" className="ml-2 bg-background text-primary border-border"><AlertTriangle className="w-3 h-3 mr-1" /> Revisar</Badge>}</td>
                    <td className="p-4 text-muted-foreground">{item.ciclo}</td>
                    <td className="p-4 text-muted-foreground">{variedadCount(item)}</td>
                    <td className="p-4"><div className="flex justify-end gap-2"><button onClick={() => openEdit({ type: "especie", item })} className="p-2 rounded-xl text-muted-foreground hover:bg-background hover:text-primary"><Pencil className="w-4 h-4" /></button><button disabled={variedadCount(item) > 0} onClick={() => removeEspecie(item)} className="p-2 rounded-xl text-muted-foreground hover:bg-background disabled:opacity-30"><Trash2 className="w-4 h-4" /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b border-border bg-background"><tr><th className="p-4 text-left">Nombre variedad</th><th className="p-4 text-left">Especie asociada</th><th className="p-4 text-left">Siembras activas</th><th className="p-4 text-right">Acciones</th></tr></thead>
              <tbody className="divide-y divide-border">
                {variedadesFiltradas.map((item) => (
                  <tr key={item.id_variedad} className="hover:bg-background transition-colors">
                    <td className="p-4 font-bold text-foreground">{item.nombre_variedad}</td>
                    <td className="p-4 text-muted-foreground">{item.especie?.nombre_comun || item.id_especie}</td>
                    <td className="p-4 text-muted-foreground">{siembraCount(item)}</td>
                    <td className="p-4"><div className="flex justify-end gap-2"><button onClick={() => openEdit({ type: "variedad", item })} className="p-2 rounded-xl text-muted-foreground hover:bg-background hover:text-primary"><Pencil className="w-4 h-4" /></button><button disabled={siembraCount(item) > 0} onClick={() => removeVariedad(item)} className="p-2 rounded-xl text-muted-foreground hover:bg-background disabled:opacity-30"><Trash2 className="w-4 h-4" /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setEditing(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-card border border-border rounded-3xl p-6 space-y-4">
              <div className="flex justify-between items-center"><h2 className="text-xl font-black text-foreground">Editar {editing.type}</h2><button onClick={() => setEditing(null)} className="p-2 rounded-xl bg-background text-muted-foreground"><X className="w-4 h-4" /></button></div>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-foreground" />
              {editing.type === "especie" && <input value={ciclo} onChange={(e) => setCiclo(e.target.value)} className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-foreground" />}
              <Button onClick={saveEdit} className="w-full rounded-2xl bg-primary text-primary-foreground font-black uppercase">Guardar cambios</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

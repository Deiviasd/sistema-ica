import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useUserStore } from "@/lib/store"
import api from "@/lib/api"
import { Inspection, LugarProduccion } from "@/components/dashboard/types/inspection"
import {
    RawPredia,
    RawLote,
    RawSiembra,
    RawPlaga,
    DetalleEnriquecido,
    EnrichedInspection
} from "@/app/dashboard/historial-registros/historialtipos"
import { SelectedModal, FilterOptions, DetallePayload } from "./tipos"

export function useReportesTecnicos() {
    const { user } = useUserStore()
    const router = useRouter()

    // ── Estado de datos ──────────────────────────────────────────
    const [inspecciones, setInspecciones] = useState<Inspection[]>([])
    const [predios, setPredios] = useState<RawPredia[]>([])
    const [siembras, setSiembras] = useState<RawSiembra[]>([])
    const [plagas, setPlagas] = useState<RawPlaga[]>([])

    // ── Estado de UI ─────────────────────────────────────────────
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [selectedModal, setSelectedModal] = useState<SelectedModal | null>(null)

    // ── Estado de filtros ─────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedPredio, setSelectedPredio] = useState("all")
    const [selectedLugar, setSelectedLugar] = useState("all")
    const [selectedLote, setSelectedLote] = useState("all")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [showFiltersPanel, setShowFiltersPanel] = useState(false)

    // ── Guardia de ruta ──────────────────────────────────────────
    // Solo técnico y admin pueden acceder
    useEffect(() => {
        if (user && user.role !== "tecnico" && user.role !== "admin") {
            router.push("/dashboard")
        }
    }, [user, router])

    // ── Fetch de datos ───────────────────────────────────────────
    const fetchData = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true)
            else setLoading(true)
            setError(null)

            const [resResumen, resPlagas] = await Promise.all([
                api.get("/api/dashboard/resumen"),
                api.get("/cultivos/plagas")
            ])

            setPredios(resResumen.data?.predios || [])
            setSiembras(resResumen.data?.siembras || [])
            const uniqueInspecciones = Array.from(new Map((resResumen.data?.inspecciones || []).map((i: any) => [i.id_inspeccion, i])).values())
            setInspecciones(uniqueInspecciones as Inspection[])
            setPlagas(resPlagas.data || [])
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Error desconocido"
            console.error("Error al cargar reportes técnicos:", message)
            setError("No se pudo cargar la información de reportes. Por favor, intente de nuevo.")
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        if (user) fetchData()
    }, [user])

    // ── Opciones de filtro ────────────────────────────────────────
    const filterOptions = useMemo<FilterOptions>(() => {
        const prediosList = predios.map(p => ({
            id: String(p.id_predio),
            nombre: p.nombre_predio
        }))

        const lugaresMap = new Map<string, string>()
        predios.forEach(p => {
            if (p.id_lugar_produccion != null && p.lugar_produccion?.nombre_lugar) {
                lugaresMap.set(String(p.id_lugar_produccion), p.lugar_produccion.nombre_lugar)
            }
        })
        const lugaresList = Array.from(lugaresMap.entries()).map(([id, nombre]) => ({ id, nombre }))

        let targetLotes: RawLote[] = []
        if (selectedPredio !== "all") {
            const pred = predios.find(p => String(p.id_predio) === selectedPredio)
            targetLotes = pred?.lote || []
        } else {
            targetLotes = predios.flatMap(p => p.lote || [])
        }
        const lotesList = targetLotes.map(lo => ({
            id: String(lo.id_lote),
            nombre: lo.nombre_lote
        }))

        return { predios: prediosList, lugares: lugaresList, lotes: lotesList }
    }, [predios, selectedPredio])

    // ── Enriquecimiento ───────────────────────────────────────────
    const enrichedInspecciones = useMemo<EnrichedInspection[]>(() => {
        const predioMap = new Map<string, RawPredia>()
        const loteMap = new Map<string, RawLote & { id_predio?: number | string }>()
        const lugarMap = new Map<string, LugarProduccion>()

        predios.forEach(p => {
            predioMap.set(String(p.id_predio), p)
            const lp = p.lugar_produccion
            if (lp && p.id_lugar_produccion != null) {
                lugarMap.set(String(p.id_lugar_produccion), lp)
            }
            p.lote?.forEach(lo => {
                loteMap.set(String(lo.id_lote), { ...lo, id_predio: p.id_predio })
            })
        })

        const siembraMap = new Map(siembras.map(s => [Number(s.id_siembra), s]))
        const plagaMap = new Map(plagas.map(p => [Number(p.id_plaga), p]))

        return inspecciones
            .filter(ins => ins.estado === "finalizada")
            .map(ins => {
                const detallesRaw =
                    (ins as Inspection & { detalle_inspeccion?: DetalleEnriquecido[] })
                        .detalle_inspeccion || []

                const detallesEnriquecidos: DetalleEnriquecido[] = detallesRaw.map(det => {
                    const siembra = siembraMap.get(Number(det.siembra_id))
                    const lote = siembra?.id_lote != null
                        ? loteMap.get(String(siembra.id_lote))
                        : undefined

                    let plagaName: string | null =
                        plagaMap.get(Number(det.plaga_id))?.nombre_comun || det.plaga || null

                    if (!plagaName && det.observaciones_especificas) {
                        plagaName =
                            det.observaciones_especificas.match(/\[Plaga:(.+?)\]/)?.[1]?.trim() ?? null
                    }

                    return {
                        ...det,
                        siembra,
                        lote,
                        lote_id: siembra?.id_lote != null ? String(siembra.id_lote) : null,
                        predio_id: lote?.id_predio != null
                            ? String(lote.id_predio)
                            : String(ins.id_predio),
                        lote_nombre: lote?.nombre_lote ||
                            (siembra?.id_lote ? `Lote #${siembra.id_lote}` : null),
                        cultivo: siembra
                            ? (siembra.variedad?.especie?.nombre_comun || siembra.especie || "Cultivo")
                            : null,
                        plaga_nombre: plagaName
                    }
                })

                let predioObj = predioMap.get(String(ins.id_predio))
                if (!predioObj) {
                    const firstDetalleConPredio = detallesEnriquecidos.find(det => det.lote?.id_predio != null)
                    if (firstDetalleConPredio?.lote?.id_predio != null) {
                        predioObj = predioMap.get(String(firstDetalleConPredio.lote.id_predio))
                    }
                }

                const lugarObj = ins.id_lugar_produccion != null
                    ? lugarMap.get(String(ins.id_lugar_produccion))
                    : undefined

                const lugar_nombre =
                    lugarObj?.nombre_lugar ||
                    predioObj?.lugar_produccion?.nombre_lugar ||
                    "Lugar sin registrar"
                const predio_nombre = predioObj?.nombre_predio || "Predio sin registrar"

                const lotesSet = new Set<string>()
                const cultivosSet = new Set<string>()
                const plagasSet = new Set<string>()

                detallesEnriquecidos.forEach(det => {
                    if (det.lote_nombre) lotesSet.add(det.lote_nombre)
                    if (det.cultivo) cultivosSet.add(det.cultivo)
                    if (det.plaga_nombre) plagasSet.add(det.plaga_nombre)
                })

                return {
                    ...ins,
                    lugar_produccion:
                        lugarObj || predioObj?.lugar_produccion || ({ nombre_lugar: lugar_nombre } as LugarProduccion),
                    lugar_nombre,
                    predio_nombre,
                    detalles_enriquecidos: detallesEnriquecidos,
                    lotes_inspeccionados: Array.from(lotesSet),
                    cultivos_evaluados: Array.from(cultivosSet),
                    plagas_identificadas: Array.from(plagasSet),
                    observaciones: ins.observaciones_generales || "Sin observaciones registradas."
                }
            })
    }, [inspecciones, predios, siembras, plagas])

    // ── Filtrado ──────────────────────────────────────────────────
    const filteredInspecciones = useMemo(() => {
        return enrichedInspecciones
            .filter(ins => {
                const matchSearch =
                    searchQuery.trim() === "" ||
                    ins.predio_nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    ins.lugar_nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    ins.observaciones?.toLowerCase().includes(searchQuery.toLowerCase())

                const matchPredio =
                    selectedPredio === "all" ||
                    String(ins.id_predio) === selectedPredio ||
                    ins.detalles_enriquecidos?.some(det => String(det.predio_id) === selectedPredio)

                const matchLugar =
                    selectedLugar === "all" ||
                    String(ins.id_lugar_produccion) === selectedLugar

                const matchLote =
                    selectedLote === "all" ||
                    ins.detalles_enriquecidos?.some(det => String(det.lote_id) === selectedLote)

                let matchDate = true
                if (ins.fecha_programada) {
                    const insDate = new Date(ins.fecha_programada).getTime()
                    if (startDate && insDate < new Date(`${startDate}T00:00:00`).getTime()) matchDate = false
                    if (endDate && insDate > new Date(`${endDate}T23:59:59`).getTime()) matchDate = false
                }

                return matchSearch && matchPredio && matchLugar && matchLote && matchDate
            })
            .map(ins => {
                if (selectedPredio === "all" && selectedLote === "all") return ins

                const lotesSet = new Set<string>()
                const cultivosSet = new Set<string>()
                const plagasSet = new Set<string>()

                ins.detalles_enriquecidos?.forEach(det => {
                    const okPredio = selectedPredio === "all" || String(det.predio_id) === selectedPredio
                    const okLote = selectedLote === "all" || String(det.lote_id) === selectedLote
                    if (okPredio && okLote) {
                        if (det.lote_nombre) lotesSet.add(det.lote_nombre)
                        if (det.cultivo) cultivosSet.add(det.cultivo)
                        if (det.plaga_nombre) plagasSet.add(det.plaga_nombre)
                    }
                })

                return {
                    ...ins,
                    lotes_inspeccionados: Array.from(lotesSet),
                    cultivos_evaluados: Array.from(cultivosSet),
                    plagas_identificadas: Array.from(plagasSet)
                }
            })
    }, [enrichedInspecciones, searchQuery, selectedPredio, selectedLugar, selectedLote, startDate, endDate])

    // ── Helpers ───────────────────────────────────────────────────
    const clearFilters = () => {
        setSearchQuery("")
        setSelectedPredio("all")
        setSelectedLugar("all")
        setSelectedLote("all")
        setStartDate("")
        setEndDate("")
    }

    const hasActiveFilters = Boolean(
        searchQuery || selectedPredio !== "all" || selectedLugar !== "all" ||
        selectedLote !== "all" || startDate || endDate
    )

    // ── Eliminar inspección ───────────────────────────────────────
    const handleDelete = async (id: number | string) => {
        try {
            setDeleteLoading(true)
            setDeleteError(null)
            await api.delete(`/inspecciones/${id}`)
            setInspecciones(prev => prev.filter(i => i.id_inspeccion !== id))
            setSelectedModal(null)
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Error desconocido"
            console.error("Error al eliminar inspección:", message)
            setDeleteError("No se pudo eliminar la inspección. Intente de nuevo.")
        } finally {
            setDeleteLoading(false)
        }
    }

    // ── Editar inspección ──────────────────────────────────────────
    const [editLoading, setEditLoading] = useState(false)
    const [editError, setEditError] = useState<string | null>(null)

    const handleSaveEdit = async (
        idInspeccion: string | number,
        observacionesGenerales: string,
        detalles: DetallePayload[]
    ) => {
        try {
            setEditLoading(true)
            setEditError(null)

            // 1. Actualizar observaciones generales de la inspección
            const patchRes = await api.patch(`/inspecciones/${idInspeccion}/finalizar`, {
                observaciones_generales: observacionesGenerales
            })
            console.log('✅ Observaciones actualizadas:', patchRes.data)

            // 2. Upsert detalles (si hay detalles que actualizar)
            if (detalles.length > 0) {
                const detallesRes = await api.post(`/inspecciones/${idInspeccion}/detalles`, detalles)
                console.log('✅ Detalles actualizados:', detallesRes.data)
            }

            // 3. Refrescar datos y cerrar modal
            await fetchData(true)
            setSelectedModal(null)
            return { success: true }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Error desconocido"
            console.error("Error al editar inspección:", message)
            setEditError("No se pudo guardar la edición. Verifica tu conexión e intenta de nuevo.")
            return { success: false, error: message }
        } finally {
            setEditLoading(false)
        }
    }


    // ── Datos derivados de usuario ────────────────────────────────
    const tecnicoNombre = user?.nombre || user?.nombre || "Técnico"

    return {
        // datos
        inspecciones,
        filteredInspecciones,
        filterOptions,
        plagas,
        // estados de carga
        loading,
        refreshing,
        error,
        deleteLoading,
        deleteError,
        editLoading,
        editError,
        // modal
        selectedModal,
        setSelectedModal,
        // filtros
        searchQuery, setSearchQuery,
        selectedPredio, setSelectedPredio,
        selectedLugar, setSelectedLugar,
        selectedLote, setSelectedLote,
        startDate, setStartDate,
        endDate, setEndDate,
        showFiltersPanel, setShowFiltersPanel,
        hasActiveFilters,
        // acciones
        fetchData,
        clearFilters,
        handleDelete,
        handleSaveEdit,
        // helpers
        tecnicoNombre
    }
}
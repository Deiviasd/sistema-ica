import { useState, useEffect } from "react"
import api from "@/lib/api"
import { Inspection, EvalItem, FormData } from "../components/dashboard/types/inspection"

export function useInspectionWizard(inspection: Inspection, onClose: () => void) {
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState<any>(null)
  const [selectedLugarId, setSelectedLugarId] = useState<number | null>(null)
  const [plagaPersonalizada, setPlagaPersonalizada] = useState("")
  const [catalogPlagas, setCatalogPlagas] = useState<any[]>([])
  const [loadingPlagas, setLoadingPlagas] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    generalObs: "",
    evaluations: []
  })
  const [currentEval, setCurrentEval] = useState<EvalItem>({
    id_lote: "",
    siembra: null,
    plaga: "",
    totales: 0,
    afectadas: 0,
    recomendacion: "",
    nota: ""
  })

  // 🐛 Efecto para cargar plagas sugeridas según la especie del cultivo seleccionado
  useEffect(() => {
    const idEspecie = (currentEval.siembra as any)?.id_especie;
    console.log("🔍 Especie detectada para catálogo:", idEspecie);
    if (!idEspecie) {
      setCatalogPlagas([]);
      return;
    }

    const fetchPlagasSugeridas = async () => {
      setLoadingPlagas(true);
      try {
        const res = await api.get(`/cultivos/plagas?id_especie=${idEspecie}`);
        setCatalogPlagas(res.data);
      } catch (err) {
        console.error("Error cargando catálogo de plagas:", err);
      } finally {
        setLoadingPlagas(false);
      }
    };

    fetchPlagasSugeridas();
  }, [currentEval.siembra]);

  const activeLugar = context?.lugares_produccion?.find(
    (l: any) => l.id_lugar_produccion === selectedLugarId
  ) || null
  const activeLotes = activeLugar?.lotes || context?.lotes || []

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const res = await api.get(`/inspecciones/${inspection.id_inspeccion}/contexto`)
        setContext(res.data)

        const lugarPrincipal = res.data.lugares_produccion?.find((l: any) => l.es_lugar_inspeccion)
        if (lugarPrincipal) {
          setSelectedLugarId(lugarPrincipal.id_lugar_produccion)
        } else if (res.data.lugares_produccion?.length > 0) {
          setSelectedLugarId(res.data.lugares_produccion[0].id_lugar_produccion)
        }

        if (res.data.hallazgos_previos && res.data.hallazgos_previos.length > 0) {
          const dedupedMap = (res.data.hallazgos_previos || []).reduce((acc: any, curr: any) => {
            if (!acc[curr.siembra_id] || curr.id_detalle > acc[curr.siembra_id].id_detalle) {
              acc[curr.siembra_id] = curr
            }
            return acc
          }, {})

          const parseado = Object.values(dedupedMap).map((hp: any) => {
            let matchLote: any = null
            let matchLugarId: number | null = null
            if (res.data.lugares_produccion) {
              for (const lugar of res.data.lugares_produccion) {
                const found = lugar.lotes?.find(
                  (lot: any) => Number(lot.siembra_activa?.id_siembra) === Number(hp.siembra_id)
                )
                if (found) {
                  matchLote = found
                  matchLugarId = lugar.id_lugar_produccion
                  break
                }
              }
            }
            const obsStr = hp.observaciones_especificas || ""
            return {
              id_detalle: hp.id_detalle,
              id_lote: matchLote ? String(matchLote.id_lote) : "",
              id_lugar_produccion: matchLugarId,
              siembra: matchLote?.siembra_activa || { id_siembra: hp.siembra_id },
              afectadas: Number(hp.cantidad_plantas_afectadas) || 0,
              totales: Number(hp.plantas_totales || hp.cantidad_plantas_afectadas) || 0,
              porcentaje: Number(hp.porcentaje_infestacion) || 0,
              plaga: obsStr.match(/\[Plaga:(.+?)\]/)?.[1]?.trim() || "Plaga detectada",
              recomendacion: obsStr.match(/\[Recomendacion:(.+?)\]/)?.[1]?.trim() || "N/A",
              nota: obsStr.split('| ').pop()?.trim() || ""
            }
          })

          setFormData(prev => ({
            ...prev,
            generalObs: inspection.observaciones_generales || "",
            evaluations: parseado
          }))
        } else {
          setFormData(prev => ({
            ...prev,
            generalObs: inspection.observaciones_generales || ""
          }))
        }
      } catch (err) {
        console.error("Error al cargar contexto:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchContext()
  }, [inspection.id_inspeccion])

  const calculateInfestation = () => {
    if (!currentEval.totales || currentEval.totales === 0) return 0
    return (currentEval.afectadas / currentEval.totales) * 100
  }

  const handleUpdateCurrentEval = (updates: Partial<EvalItem>) => {
    const updated = { ...currentEval, ...updates }
    setCurrentEval(updated)
    if (!updated.id_lote) return

    setFormData((prev) => {
      const evals = [...prev.evaluations]
      const idx = evals.findIndex((e) => e.id_lote === updated.id_lote)
      const porcentaje = updated.totales > 0 ? (updated.afectadas / updated.totales) * 100 : 0
      const toSave = { ...updated, porcentaje }
      if (idx >= 0) {
        evals[idx] = { ...evals[idx], ...toSave }
      } else {
        if (toSave.plaga || toSave.afectadas > 0 || toSave.nota) {
          evals.push(toSave)
        }
      }
      return { ...prev, evaluations: evals }
    })
  }

  const handleSelectLote = (lote: any) => {
    const existing = formData.evaluations.find((ev) => String(ev.id_lote) === String(lote.id_lote))
    if (existing) {
      setCurrentEval(existing)
    } else {
      setCurrentEval({
        id_lote: String(lote.id_lote),
        id_lugar_produccion: selectedLugarId,
        siembra: lote.siembra_activa,
        plaga: "",
        totales: lote.siembra_activa?.cantidad_plantas || 0,
        afectadas: 0,
        recomendacion: "",
        nota: ""
      })
    }
  }

  const handleChangeLugar = (newId: number) => {
    setSelectedLugarId(newId)
    setCurrentEval({ id_lote: "", siembra: null, plaga: "", totales: 0, afectadas: 0, recomendacion: "", nota: "" })
    setPlagaPersonalizada("")
  }

  const handleFinish = async (status: 'finalizada' | 'en_proceso') => {
    setIsFinishing(true)
    try {
      const evaluationsToSave = formData.evaluations.filter(e => e.plaga)
      
      // 🚀 PROCESAMIENTO DE PLAGAS: Asegurar que todas tengan un ID real
      const processedEvaluations = await Promise.all(evaluationsToSave.map(async (e) => {
        // Verificar si la plaga seleccionada ya es un ID del catálogo
        const isFromCatalog = catalogPlagas.find(p => p.nombre_comun === e.plaga);
        let plagaId = isFromCatalog?.id_plaga;

        // Si no está en el catálogo, es un registro manual que debemos persistir
        if (!plagaId) {
          try {
            const resManual = await api.post('/cultivos/plagas/manual', {
              nombre: e.plaga,
              id_especie: (e.siembra as any)?.id_especie || 1
            });
            plagaId = resManual.data.id_plaga;
            console.log(`✅ Plaga manual "${e.plaga}" registrada con ID: ${plagaId}`);
          } catch (err) {
            console.error("Error registrando plaga manual, usando ID genérico:", err);
            plagaId = 1; // Fallback a ID genérico si falla
          }
        }

        return {
          ...e,
          plaga_id: plagaId
        };
      }));

      if (processedEvaluations.length > 0) {
        const savedRes = await api.post(
          `/inspecciones/${inspection.id_inspeccion}/detalles`,
          processedEvaluations.map(e => ({
            id_detalle: e.id_detalle,
            siembra_id: e.siembra?.id_siembra || 1,
            plaga_id: e.plaga_id,
            cantidad_plantas_afectadas: e.afectadas,
            plantas_totales: e.totales,
            porcentaje_infestacion: e.porcentaje,
            observaciones_especificas: `[Plaga: ${e.plaga}] | [Recomendacion: ${e.recomendacion || 'N/A'}] | ${e.nota || ''}`
          }))
        )

        if (Array.isArray(savedRes.data) && savedRes.data.length > 0) {
          const savedItems: any[] = savedRes.data
          setFormData(prev => ({
            ...prev,
            evaluations: prev.evaluations.map(ev => {
              const match = savedItems.find(
                s => Number(s.siembra_id) === Number(ev.siembra?.id_siembra)
              )
              if (match && !ev.id_detalle) return { ...ev, id_detalle: match.id_detalle }
              return ev
            })
          }))
        }
      }

      try {
        await api.patch(`/inspecciones/${inspection.id_inspeccion}/finalizar`, {
          observaciones_generales: formData.generalObs,
          estado: status
        })
      } catch (patchErr) {
        console.warn("Se guardaron los hallazgos, pero el estado falló:", patchErr)
      }

      alert(`✅ Inspección guardada como "${status === 'en_proceso' ? 'En Proceso' : 'Finalizada'}"`)
      onClose()
    } catch (err) {
      console.error("Error al guardar:", err)
    } finally {
      setIsFinishing(false)
    }
  }

  return {
    loading,
    context,
    activeLotes,
    selectedLugarId,
    plagaPersonalizada,
    setPlagaPersonalizada,
    catalogPlagas,
    loadingPlagas,
    isFinishing,
    formData,
    setFormData,
    currentEval,
    calculateInfestation,
    handleUpdateCurrentEval,
    handleSelectLote,
    handleChangeLugar,
    handleFinish,
  }
}

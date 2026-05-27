import { useState, useEffect } from "react"
import api from "@/lib/api"
import { OfflineDB } from "@/lib/offline-db"
import { Inspection, EvalItem, FormData, ContextoInspeccion, Plaga, Predio, Lote, HallazgoPrevio, LugarProduccion } from "../components/dashboard/types/inspection"

export function useInspectionWizard(inspection: Inspection, onClose: () => void) {
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState<ContextoInspeccion | null>(null)
  const [selectedPredioId, setSelectedPredioId] = useState<number | null>(null)
  const [plagaPersonalizada, setPlagaPersonalizada] = useState("")
  const [catalogPlagas, setCatalogPlagas] = useState<Plaga[]>([])
  const [loadingPlagas, setLoadingPlagas] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)
  const [initialEvaluations, setInitialEvaluations] = useState<EvalItem[]>([])
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
    const idEspecie = currentEval.siembra?.id_especie;
    console.log("🔍 Especie detectada para catálogo:", idEspecie);
    if (!idEspecie) {
      setCatalogPlagas([]);
      return;
    }

    const fetchPlagasSugeridas = async () => {
      setLoadingPlagas(true);
      try {
        const res = await api.get(`/cultivos/plagas?id_especie=${idEspecie}`);
        const plagasList = res.data || [];
        setCatalogPlagas(plagasList);

        if (currentEval.plaga) {
          const exists = plagasList.some((p: Plaga) => p.nombre_comun === currentEval.plaga);
          if (!exists) {
            setPlagaPersonalizada(currentEval.plaga);
          } else {
            setPlagaPersonalizada("");
          }
        } else {
          setPlagaPersonalizada("");
        }
      } catch (err) {
        console.error("Error cargando catálogo de plagas:", err);
      } finally {
        setLoadingPlagas(false);
      }
    };

    fetchPlagasSugeridas();
  }, [currentEval.siembra, currentEval.plaga]);

  // Aplanamos todos los predios de todos los lugares de producción para buscarlos fácilmente
  const allPredios = context?.lugares_produccion?.flatMap((l: LugarProduccion) =>
    (l.predios || []).map((p: Predio) => ({ ...p, id_lugar_produccion: l.id_lugar_produccion }))
  ) || []

  const activePredio = allPredios.find((p) => Number(p.id_predio) === Number(selectedPredioId)) || null
  const activeLotes = activePredio?.lotes || []
  const selectedLugarId = activePredio?.id_lugar_produccion || null

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const res = await api.get(`/inspecciones/${inspection.id_inspeccion}/contexto`)
        setContext(res.data)

        const flatPredios = res.data.lugares_produccion?.flatMap((l: LugarProduccion) => l.predios || []) || []

        // Priorizar el predio oficial asignado a la inspección
        const predioOficial = inspection.id_predio
          ? flatPredios.find((p: Predio) => Number(p.id_predio) === Number(inspection.id_predio))
          : null

        if (predioOficial) {
          setSelectedPredioId(Number(predioOficial.id_predio))
        } else if (flatPredios.length > 0) {
          setSelectedPredioId(Number(flatPredios[0].id_predio))
        }

        if (res.data.hallazgos_previos && res.data.hallazgos_previos.length > 0) {
          const dedupedMap = (res.data.hallazgos_previos || []).reduce((acc: Record<number, HallazgoPrevio>, curr: HallazgoPrevio) => {
            const siembraId = curr.siembra_id || 0
            if (!acc[siembraId] || (curr.id_detalle && acc[siembraId].id_detalle && curr.id_detalle > (acc[siembraId].id_detalle || 0))) {
              acc[siembraId] = curr
            }
            return acc
          }, {} as Record<number, HallazgoPrevio>)

          const parseado: EvalItem[] = (Object.values(dedupedMap) as HallazgoPrevio[]).map((hp): EvalItem => {
            let matchLote: Lote | null = null
            let matchLugarId: number | null = null
            if (res.data.lugares_produccion) {
              for (const lugar of res.data.lugares_produccion) {
                // Buscar en predios del lugar
                if (lugar.predios) {
                  for (const predio of lugar.predios) {
                    const found = predio.lotes?.find(
                      (lot: Lote) =>
                        Number(lot.id_lote) === Number(hp.id_lote) ||
                        Number(lot.siembra_activa?.id_siembra) === Number(hp.siembra_id)
                    )
                    if (found) {
                      matchLote = found
                      matchLugarId = lugar.id_lugar_produccion ?? null
                      break
                    }
                  }
                }
                // Fallback a lotes directos del lugar
                if (!matchLote && lugar.lotes) {
                  const found = lugar.lotes.find(
                    (lot: Lote) =>
                      Number(lot.id_lote) === Number(hp.id_lote) ||
                      Number(lot.siembra_activa?.id_siembra) === Number(hp.siembra_id)
                  )
                  if (found) {
                    matchLote = found
                    matchLugarId = lugar.id_lugar_produccion ?? null
                  }
                }
                if (matchLote) break
              }
            }
            const obsStr = hp.observaciones_especificas || ""
            const extractedPlaga = obsStr.match(/\[Plaga:(.+?)\]/)?.[1]?.trim() || hp.plaga || ""
            return {
              id_detalle: hp.id_detalle,
              id_lote: matchLote ? String(matchLote.id_lote) : String(hp.id_lote || ""),
              id_lugar_produccion: matchLugarId,
              siembra: matchLote?.siembra_activa ?? (hp.siembra_id != null ? { id_siembra: hp.siembra_id } : null),
              afectadas: Number(hp.cantidad_plantas_afectadas) || 0,
              totales: Number(hp.plantas_totales || hp.cantidad_plantas_afectadas) || 0,
              porcentaje: Number(hp.porcentaje_infestacion) || 0,
              plaga: extractedPlaga,
              recomendacion: obsStr.match(/\[Recomendacion:(.+?)\]/)?.[1]?.trim() || "N/A",
              nota: obsStr.split('| ').pop()?.trim() ?? ""
            }
          })

          setFormData(prev => ({
            ...prev,
            generalObs: res.data.observaciones_generales || inspection.observaciones_generales || "",
            evaluations: parseado
          }))
          setInitialEvaluations(JSON.parse(JSON.stringify(parseado)))
        } else {
          setFormData(prev => ({
            ...prev,
            generalObs: res.data.observaciones_generales || inspection.observaciones_generales || ""
          }))
        }
      } catch (err) {
        console.error("Error al cargar contexto:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchContext()
  }, [inspection.id_inspeccion, inspection.id_predio, inspection.observaciones_generales])

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

  const handleSelectLote = (lote: Lote) => {
    if (String(currentEval.id_lote) === String(lote.id_lote)) {
      // Solo deseleccionar visualmente (cerrar panel), NO borrar los datos del lote evaluado
      setCurrentEval({
        id_lote: "",
        siembra: null,
        plaga: "",
        totales: 0,
        afectadas: 0,
        recomendacion: "",
        nota: ""
      })
      return
    }

    const existing = formData.evaluations.find((ev) => String(ev.id_lote) === String(lote.id_lote))
    if (existing) {
      setCurrentEval(existing)
    } else {
      const newEval: EvalItem = {
        id_lote: String(lote.id_lote),
        id_lugar_produccion: selectedLugarId,
        siembra: lote.siembra_activa ?? null,
        plaga: "",
        totales: lote.siembra_activa?.cantidad_plantas || 0,
        afectadas: 0,
        recomendacion: "",
        nota: ""
      }
      setCurrentEval(newEval)
    }
  }

  const handleSaveLoteEvaluation = (activeLotes: Lote[]) => {
    if (!currentEval.id_lote) return { success: false, error: "No hay lote seleccionado." }

    const hasPlaga = currentEval.plaga && currentEval.plaga.trim() !== ""
    const afectadasCount = Number(currentEval.afectadas) || 0

    if (hasPlaga) {
      if (afectadasCount <= 0) {
        return { success: false, error: "Si hay plaga detectada, el número de plantas afectadas debe ser mayor a 0." }
      }
      if (afectadasCount > (currentEval.totales || 0)) {
        return { success: false, error: `El número de plantas afectadas (${afectadasCount}) no puede superar el total de plantas (${currentEval.totales}).` }
      }
      if (!currentEval.recomendacion || currentEval.recomendacion.trim() === "") {
        return { success: false, error: "Debe escribir una recomendación de manejo para la plaga detectada." }
      }
    } else {
      if (afectadasCount > 0) {
        return { success: false, error: "No puede haber plantas afectadas si no se ha detectado ninguna plaga. Marque 0 en plantas afectadas o seleccione la plaga correspondiente." }
      }
    }

    // Comparar con la evaluación existente en el estado local
    const existing = formData.evaluations.find((ev) => String(ev.id_lote) === String(currentEval.id_lote))
    if (existing) {
      const isUnchanged =
        String(existing.plaga || "") === String(currentEval.plaga || "") &&
        Number(existing.afectadas) === Number(currentEval.afectadas) &&
        Number(existing.totales) === Number(currentEval.totales) &&
        String(existing.recomendacion || "") === String(currentEval.recomendacion || "") &&
        String(existing.nota || "") === String(currentEval.nota || "")

      if (isUnchanged) {
        advanceToNextLote(activeLotes)
        return { success: true, isUnchanged: true }
      }
    }

    setFormData(prev => {
      const filtered = prev.evaluations.filter(ev => String(ev.id_lote) !== String(currentEval.id_lote))
      return {
        ...prev,
        evaluations: [...filtered, currentEval]
      }
    })

    advanceToNextLote(activeLotes)
    return { success: true, isUnchanged: false }
  }

  const advanceToNextLote = (activeLotes: Lote[]) => {
    const currentIndex = activeLotes.findIndex(l => String(l.id_lote) === String(currentEval.id_lote))
    let nextLote = null
    for (let i = currentIndex + 1; i < activeLotes.length; i++) {
      if (activeLotes[i].siembra_activa) {
        nextLote = activeLotes[i]
        break
      }
    }
    if (!nextLote) {
      nextLote = activeLotes.find(l =>
        l.siembra_activa &&
        String(l.id_lote) !== String(currentEval.id_lote) &&
        !formData.evaluations.some(ev => String(ev.id_lote) === String(l.id_lote))
      )
    }
    if (nextLote) {
      const existing = formData.evaluations.find((ev) => String(ev.id_lote) === String(nextLote!.id_lote))
      if (existing) {
        setCurrentEval(existing)
      } else {
        setCurrentEval({
          id_lote: String(nextLote!.id_lote),
          id_lugar_produccion: selectedLugarId,
          siembra: nextLote!.siembra_activa ?? null,
          plaga: "",
          totales: nextLote!.siembra_activa?.cantidad_plantas || 0,
          afectadas: 0,
          recomendacion: "",
          nota: ""
        })
      }
    } else {
      setCurrentEval({
        id_lote: "",
        siembra: null,
        plaga: "",
        totales: 0,
        afectadas: 0,
        recomendacion: "",
        nota: ""
      })
    }
  }

  const handleResetLote = async (idLote: string | number) => {
    const existing = formData.evaluations.find(ev => String(ev.id_lote) === String(idLote))
    if (existing && existing.id_detalle) {
      try {
        await api.delete(`/inspecciones/detalles/${existing.id_detalle}`)
        console.log(`✅ Detalle ${existing.id_detalle} eliminado de la base de datos.`)
      } catch (err) {
        console.error("Error al eliminar detalle de la base de datos:", err)
      }
    }

    setFormData(prev => ({
      ...prev,
      evaluations: prev.evaluations.filter(ev => String(ev.id_lote) !== String(idLote))
    }))
    setInitialEvaluations(prev => prev.filter(ev => String(ev.id_lote) !== String(idLote)))

    if (String(currentEval.id_lote) === String(idLote)) {
      setCurrentEval({
        id_lote: "",
        siembra: null,
        plaga: "",
        totales: 0,
        afectadas: 0,
        recomendacion: "",
        nota: ""
      })
    }
  }

  const handleChangePredio = (newId: number) => {
    setSelectedPredioId(newId)
    setCurrentEval({ id_lote: "", siembra: null, plaga: "", totales: 0, afectadas: 0, recomendacion: "", nota: "" })
    setPlagaPersonalizada("")
  }

  const handleFinish = async (status: 'finalizada' | 'en_proceso') => {
    setIsFinishing(true)
    try {
      const allLotes = allPredios.flatMap((p) => p.lotes || []).filter((l) => l.siembra_activa)
      const missingLotes = allLotes.filter((l) =>
        !formData.evaluations.some(ev => String(ev.id_lote) === String(l.id_lote))
      )

      if (status === 'finalizada' && missingLotes.length > 0) {
        const missingNames = missingLotes.map((l) => l.nombre_lote).join(", ")
        alert(`❌ No se puede finalizar la inspección. Aún faltan por revisar los siguientes lotes: ${missingNames}`)
        setIsFinishing(false)
        return
      }

      const evaluationsToSave = formData.evaluations

      // 🚀 PROCESAMIENTO DE PLAGAS: Asegurar que todas tengan un ID real (o null si es lote sano)
      type EvalWithPlagaId = EvalItem & { plaga_id: number | null | undefined }
      const processedEvaluations: EvalWithPlagaId[] = await Promise.all(evaluationsToSave.map(async (e): Promise<EvalWithPlagaId> => {
        if (!e.plaga || e.plaga === "Ninguna") {
          return {
            ...e,
            plaga_id: null
          };
        }

        // Verificar si la plaga seleccionada ya es un ID del catálogo
        const isFromCatalog = catalogPlagas.find(p => p.nombre_comun === e.plaga);
        let plagaId: number | undefined = isFromCatalog?.id_plaga;

        // Si no está en el catálogo, es un registro manual que debemos persistir
        if (!plagaId) {
          try {
            const resManual = await api.post('/cultivos/plagas/manual', {
              nombre: e.plaga,
              id_especie: e.siembra?.id_especie || 1
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

      // Filtrar para enviar a la base de datos solo los nuevos o modificados
      const changedOrNew = processedEvaluations.filter(e => {
        const initial = initialEvaluations.find(ie => String(ie.id_lote) === String(e.id_lote))
        if (!initial) return true // Nuevo registro

        // Comparar si hay cambios reales
        const isSame =
          String(initial.plaga || "") === String(e.plaga || "") &&
          Number(initial.afectadas) === Number(e.afectadas) &&
          Number(initial.totales) === Number(e.totales) &&
          String(initial.recomendacion || "") === String(e.recomendacion || "") &&
          String(initial.nota || "") === String(e.nota || "")

        return !isSame
      })

      if (changedOrNew.length > 0) {
        const savedRes = await api.post(
          `/inspecciones/${inspection.id_inspeccion}/detalles`,
          changedOrNew.map(e => ({
            id_detalle: e.id_detalle,
            siembra_id: e.siembra?.id_siembra || 1,
            plaga_id: e.plaga_id,
            cantidad_plantas_afectadas: e.afectadas,
            plantas_totales: e.totales,
            porcentaje_infestacion: e.porcentaje,
            observaciones_especificas: `[Plaga: ${e.plaga || ''}] | [Recomendacion: ${e.recomendacion || 'N/A'}] | ${e.nota || ''}`
          }))
        )

        if (Array.isArray(savedRes.data) && savedRes.data.length > 0) {
          const savedItems: { siembra_id: number; id_detalle: number }[] = savedRes.data

          // Asignar el ID de detalle real a las fotos encoladas de IndexedDB
          try {
            const db = new OfflineDB()
            for (const s of savedItems) {
              const evaluation = formData.evaluations.find(ev => Number(ev.siembra?.id_siembra) === Number(s.siembra_id))
              if (evaluation && evaluation.id_lote) {
                await db.asociarDetalleReal(evaluation.id_lote, s.id_detalle)
              }
            }
          } catch (err) {
            console.error("Error al asociar detalle real a fotos en IndexedDB:", err)
          }

          const updatedEvaluations = formData.evaluations.map(ev => {
            const match = savedItems.find(
              s => Number(s.siembra_id) === Number(ev.siembra?.id_siembra)
            )
            if (match && !ev.id_detalle) return { ...ev, id_detalle: match.id_detalle }
            return ev
          })

          setFormData(prev => ({
            ...prev,
            evaluations: updatedEvaluations
          }))
          setInitialEvaluations(JSON.parse(JSON.stringify(updatedEvaluations)))
        } else {
          setInitialEvaluations(JSON.parse(JSON.stringify(formData.evaluations)))
        }
      } else {
        // No hay hallazgos modificados o nuevos, pero igual guardamos el snapshot actual
        setInitialEvaluations(JSON.parse(JSON.stringify(formData.evaluations)))
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
    selectedPredioId,
    allPredios,
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
    handleResetLote,
    handleSaveLoteEvaluation,
    handleChangePredio,
    handleFinish,
  }
}

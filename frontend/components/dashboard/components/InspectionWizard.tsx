import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { Inspection } from "../types/inspection"
import { useInspectionWizard } from "@/hooks/useInspectionWizard"
import { DossierModal } from "./DossierModal"
import { InformeCompletoModal } from "./InformeCompletoModal"
import { EvaluationForm } from "./InspectionWizard/EvaluationForm"
import { GeneralInfoSection } from "./InspectionWizard/GeneralInfoSection"
import { InspectionHeader } from "./InspectionWizard/InspectionHeader"
import { LoteSelector } from "./InspectionWizard/LoteSelector"
import { ResetConfirmModal } from "./InspectionWizard/ResetConfirmModal"
import { SummarySidebar } from "./InspectionWizard/SummarySidebar"
import { ToastNotification } from "./InspectionWizard/ToastNotification"
import { ToastType } from "./InspectionWizard/types"
import { useEvidenceManager } from "./InspectionWizard/useEvidenceManager"
import api from "@/lib/api"

interface Props {
  inspection: Inspection
  onClose: () => void
}

export function InspectionWizard({ inspection, onClose }: Props) {
  const [showDossier, setShowDossier] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [selectedLoteToReset, setSelectedLoteToReset] = useState<string | number | null>(null)
  const [resetLoteName, setResetLoteName] = useState("")
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [toastType, setToastType] = useState<ToastType>("success")

  const {
    loading,
    context,
    activeLotes,
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
  } = useInspectionWizard(inspection, onClose)

  const notify = (message: string, type: ToastType, duration = 2000) => {
    setToastMessage(message)
    setToastType(type)
    setShowToast(true)
    setTimeout(() => setShowToast(false), duration)
  }

  const {
    evidenciasLote,
    isOnline,
    isCapturingEvidence,
    fileInputRef,
    processAndSaveImage,
    handleRemoveEvidenceLocal
  } = useEvidenceManager({ currentEval, showToast: notify })

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[500px] bg-slate-950/20 rounded-[3rem] border border-slate-800">
      <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-6" />
      <p className="text-slate-500 font-black tracking-widest uppercase text-xs">Cargando protocolo de inspección...</p>
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-20">
      <InspectionHeader isOnline={isOnline} onOpenDossier={() => setShowDossier(true)} />

      <AnimatePresence>
        {showDossier && <DossierModal context={context} onClose={() => setShowDossier(false)} />}
      </AnimatePresence>

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <GeneralInfoSection
            selectedPredioId={selectedPredioId}
            allPredios={allPredios}
            formData={formData}
            setFormData={setFormData}
            context={context}
            inspection={inspection}
            onChangePredio={handleChangePredio}
          />

          <LoteSelector
            activeLotes={activeLotes}
            currentEval={currentEval}
            formData={formData}
            context={context}
            onSelectLote={handleSelectLote}
            onRequestReset={(loteId, loteName) => {
              setSelectedLoteToReset(loteId)
              setResetLoteName(loteName)
              setShowResetConfirm(true)
            }}
          />

          <EvaluationForm
            currentEval={currentEval}
            plagaPersonalizada={plagaPersonalizada}
            setPlagaPersonalizada={setPlagaPersonalizada}
            catalogPlagas={catalogPlagas}
            loadingPlagas={loadingPlagas}
            calculateInfestation={calculateInfestation}
            handleUpdateCurrentEval={handleUpdateCurrentEval}
            isOnline={isOnline}
            fileInputRef={fileInputRef}
            isCapturingEvidence={isCapturingEvidence}
            processAndSaveImage={processAndSaveImage}
            evidenciasLote={evidenciasLote}
            handleRemoveEvidenceLocal={handleRemoveEvidenceLocal}
            activeLotes={activeLotes}
            handleSaveLoteEvaluation={handleSaveLoteEvaluation}
            onConfirmManualPlaga={async (nombre) => {
              try {
                await api.post('/cultivos/plagas/manual', {
                  nombre: nombre,
                  id_especie: currentEval.siembra?.id_especie || 1
                });
                notify(`Plaga "${nombre}" registrada con éxito`, "success");
              } catch (err) {
                console.error("Error al registrar plaga:", err);
                notify("Error al registrar la plaga", "error");
              }
            }}
            showToast={notify}
          />
        </div>

        <SummarySidebar
          allPredios={allPredios}
          formData={formData}
          isFinishing={isFinishing}
          onOpenReport={() => setShowReport(true)}
          handleFinish={handleFinish}
        />
      </div>

      {showReport && (
        <InformeCompletoModal
          inspection={inspection}
          liveFormData={formData}
          onClose={() => setShowReport(false)}
        />
      )}

      <ResetConfirmModal
        open={showResetConfirm}
        loteName={resetLoteName}
        onCancel={() => setShowResetConfirm(false)}
        onConfirm={() => {
          if (selectedLoteToReset !== null) handleResetLote(selectedLoteToReset)
          setShowResetConfirm(false)
        }}
      />

      <ToastNotification open={showToast} message={toastMessage} type={toastType} />
    </motion.div>
  )
}

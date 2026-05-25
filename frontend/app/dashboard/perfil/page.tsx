"use client"

import { useCallback, useEffect, useState, type ChangeEvent } from "react"
import api from "@/lib/api"
import { useUserStore } from "@/lib/store"
import {
  AdminStatsSection,
  FullUserProfile,
  GeneralInfoCard,
  ProductionPlacesSection,
  ProductionPlace,
  ProducerStatsSection,
  ProfileError,
  ProfileHeader,
  ProfileLoading,
  ProfileSidebar,
  TecnicoStatsSection,
} from "./profile-components"

interface InspectionInfo {
  estado?: string
}

interface SystemUserInfo {
  estado?: string
  id_rol?: string
}

export default function ProfilePage() {
  const { user, setUser } = useUserStore()
  const [profileData, setProfileData] = useState<FullUserProfile | null>(null)
  const [lugares, setLugares] = useState<ProductionPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [pendingPhotoBase64, setPendingPhotoBase64] = useState<string | null>(null)

  const [producerStats, setProducerStats] = useState({
    predios: 0,
    inspecciones: 0,
    inspeccionesActivas: 0,
  })

  const [tecnicoStats, setTecnicoStats] = useState({
    asignadas: 0,
    finalizadas: 0,
    activas: 0,
  })

  const [adminStats, setAdminStats] = useState({
    totalUsuarios: 0,
    activos: 0,
    tecnicos: 0,
  })

  const fetchProducerStats = useCallback(async () => {
    try {
      const [prediosRes, inspRes, lugaresRes] = await Promise.all([
        api.get<unknown[]>("/predios/list"),
        api.get<InspectionInfo[]>("/inspecciones/reporte"),
        api.get<ProductionPlace[]>("/predios/lugares-produccion"),
      ])

      const activeInsps = (inspRes.data || []).filter(
        (ins) => ins.estado === "programada" || ins.estado === "en_proceso"
      )

      setProducerStats({
        predios: prediosRes.data?.length || 0,
        inspecciones: inspRes.data?.length || 0,
        inspeccionesActivas: activeInsps.length || 0,
      })

      setLugares(lugaresRes.data || [])
    } catch (statsErr) {
      console.error("⚠️ Error cargando estadísticas del productor:", statsErr)
    }
  }, [])

  const fetchTecnicoStats = useCallback(async () => {
    try {
      const res = await api.get<InspectionInfo[]>("/inspecciones/asignadas")
      const asignadas = res.data || []
      const completadas = asignadas.filter((ins) => ins.estado === "finalizada").length
      const activas = asignadas.filter((ins) => ins.estado === "programada" || ins.estado === "en_proceso").length

      setTecnicoStats({
        asignadas: asignadas.length,
        finalizadas: completadas,
        activas: activas,
      })
    } catch (statsErr) {
      console.error("⚠️ Error cargando estadísticas del técnico:", statsErr)
    }
  }, [])

  const fetchAdminStats = useCallback(async () => {
    try {
      const usersRes = await api.get<SystemUserInfo[]>("/auth/users/all")
      const users = usersRes.data || []
      const activeUsers = users.filter((u) => u.estado === "activo").length
      const tecnicos = users.filter((u) => u.id_rol === "TECNICO").length

      setAdminStats({
        totalUsuarios: users.length,
        activos: activeUsers,
        tecnicos: tecnicos,
      })
    } catch (statsErr) {
      console.error("⚠️ Error cargando estadísticas del admin:", statsErr)
    }
  }, [])

  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const profileRes = await api.get<FullUserProfile>(`/auth/usuarios/${user?.id_usuario}`)
      setProfileData(profileRes.data)

      if (user?.role === "productor") {
        await fetchProducerStats()
      } else if (user?.role === "tecnico") {
        await fetchTecnicoStats()
      } else if (user?.role === "admin") {
        await fetchAdminStats()
      }
    } catch (err: unknown) {
      console.error("Error fetching profile details:", err)
      setError("No se pudo cargar la información completa del perfil. Por favor, intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }, [fetchAdminStats, fetchProducerStats, fetchTecnicoStats, user?.id_usuario, user?.role])

  useEffect(() => {
    if (user?.id_usuario) {
      fetchProfileData()
    }
  }, [fetchProfileData, user?.id_usuario])

  const handlePhotoClick = () => {
    document.getElementById("avatar-upload")?.click()
  }

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id_usuario) return

    try {
      setError(null)
      const webpBlob = await processImage(file)
      const reader = new FileReader()
      reader.readAsDataURL(webpBlob)
      reader.onloadend = () => {
        // Solo guardamos el preview — NO enviamos al server todavía
        setPendingPhotoBase64(reader.result as string)
      }
    } catch {
      setError("Error al procesar la imagen.")
    }
  }

  const processImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")
          const MAX_SIZE = 800
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width
              width = MAX_SIZE
            }
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height
            height = MAX_SIZE
          }

          canvas.width = width
          canvas.height = height
          ctx?.drawImage(img, 0, 0, width, height)
          canvas.toBlob((blob) => {
            if (blob) resolve(blob)
            else reject(new Error("Error canvas"))
          }, "image/webp", 0.8)
        }
      }
      reader.onerror = (err) => reject(err)
    })
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { aspectRatio: 1, facingMode: "user" } })
      setCameraStream(stream)
      setShowCameraModal(true)
    } catch {
      setError("No se pudo acceder a la cámara.")
    }
  }

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
    setShowCameraModal(false)
  }

  const capturePhoto = async () => {
    const video = document.getElementById("camera-preview") as HTMLVideoElement
    if (!video || !user?.id_usuario) return

    try {
      setIsUploading(true)
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext("2d")?.drawImage(video, 0, 0)

      canvas.toBlob(async (blob) => {
        if (!blob) return
        const reader = new FileReader()
        reader.readAsDataURL(blob)
        reader.onloadend = () => {
          // Solo guardamos el preview — el modal de confirmación se encarga del upload
          setPendingPhotoBase64(reader.result as string)
          stopCamera()
          setIsUploading(false)
        }
      }, "image/webp", 0.8)
    } catch {
      setError("Error al capturar foto.")
      setIsUploading(false)
    }
  }

  const handleConfirmPhoto = async () => {
    if (!pendingPhotoBase64) return
    try {
      setIsUploading(true)
      const response = await api.patch("/auth/profile", { foto_perfil: pendingPhotoBase64 })
      updateProfilePhoto(response.data.foto_perfil)
      setPendingPhotoBase64(null)
      // Limpiar input file por si acaso
      const input = document.getElementById("avatar-upload") as HTMLInputElement
      if (input) input.value = ""
    } catch {
      setError("Error al guardar la foto en el servidor.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancelPhoto = () => {
    setPendingPhotoBase64(null)
    const input = document.getElementById("avatar-upload") as HTMLInputElement
    if (input) input.value = ""
  }

  const handleDeletePhoto = async () => {
    try {
      setIsUploading(true)
      await api.patch("/auth/profile", { foto_perfil: null })
      if (profileData) setProfileData({ ...profileData, foto_perfil: undefined })
      if (user) setUser({ ...user, foto_perfil: undefined })
    } catch {
      setError("Error al eliminar la foto.")
    } finally {
      setIsUploading(false)
    }
  }

  const updateProfilePhoto = (fotoPerfil: string) => {
    if (profileData) setProfileData({ ...profileData, foto_perfil: fotoPerfil })
    if (user) setUser({ ...user, foto_perfil: fotoPerfil })
  }

  if (loading) return <ProfileLoading />

  const displayName = profileData?.nombre || user?.nombre || "Usuario del Sistema"
  const displayEmail = profileData?.correo || user?.email || ""
  const displayDocument = profileData?.documento || user?.identificacion || "No registrado"
  const displayStatus = profileData?.estado || "activo"
  const initials = displayName.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || "US"

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
      <ProfileHeader />
      <ProfileError error={error} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <ProfileSidebar
          profileData={profileData}
          displayName={displayName}
          displayStatus={displayStatus}
          initials={initials}
          isUploading={isUploading}
          showCameraModal={showCameraModal}
          cameraStream={cameraStream}
          pendingPhotoBase64={pendingPhotoBase64}
          onPhotoClick={handlePhotoClick}
          onPhotoUpload={handlePhotoUpload}
          onStartCamera={startCamera}
          onStopCamera={stopCamera}
          onCapturePhoto={capturePhoto}
          onConfirmPhoto={handleConfirmPhoto}
          onCancelPhoto={handleCancelPhoto}
          onDeletePhoto={handleDeletePhoto}
        />

        <div className="lg:col-span-2 space-y-8">
          <GeneralInfoCard displayName={displayName} displayDocument={displayDocument} displayEmail={displayEmail} />

          {user?.role === "productor" && <ProducerStatsSection producerStats={producerStats} />}
          {user?.role === "tecnico" && <TecnicoStatsSection tecnicoStats={tecnicoStats} profileData={profileData} />}
          {user?.role === "admin" && <AdminStatsSection adminStats={adminStats} />}

          {user?.role === "productor" && (
            <ProductionPlacesSection
              lugares={lugares}
              displayName={displayName}
              displayDocument={displayDocument}
              profileData={profileData}
            />
          )}
        </div>
      </div>
    </div>
  )
}

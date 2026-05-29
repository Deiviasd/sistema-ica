"use client"

import { motion } from "framer-motion"
import type { ChangeEvent, ReactNode } from "react"
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardList,
  FileText,
  ImageOff,
  Loader2,
  Mail,
  MapPin,
  Plus,
  RefreshCw,
  RotateCw,
  Shield,
  Sprout,
  Trash2,
  User,
  X,
} from "lucide-react"
import Link from "next/link"
import Image from 'next/image'
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

export interface FullUserProfile {
  id_usuario: number
  nombre: string
  documento: string
  correo: string
  id_rol: string
  id_region?: number
  estado: string
  foto_perfil?: string
  rol?: {
    id_rol: string
    nombre_rol: string
    descripcion: string
  }
  region?: {
    id_region: number
    nombre_region: string
    departamento?: string
    municipio?: string
    vereda?: string
    direccion?: string
  }
}

export interface RegionInfo {
  departamento?: string
  municipio?: string
  vereda?: string
}

export interface PredioInfo {
  id_predio: number | string
  nombre_predio: string
  area_hectareas?: number | string
  numero_predial?: string
  region?: RegionInfo
}

export interface ProductionPlace {
  id_lugar_produccion: number | string
  nombre_lugar: string
  numero_registro?: string
  predio?: PredioInfo[]
}

interface ProducerStats {
  predios: number
  inspecciones: number
  inspeccionesActivas: number
}

interface TecnicoStats {
  asignadas: number
  finalizadas: number
  activas: number
}

interface AdminStats {
  totalUsuarios: number
  activos: number
  tecnicos: number
}

export function ProfileLoading() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-12 h-12 text-teal-500 animate-spin" />
      <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs animate-pulse">Cargando Perfil del Usuario...</p>
    </div>
  )
}

export function ProfileHeader() {
  return (
    <div className="flex items-center justify-between border-b border-border pb-5">
      <div className="space-y-1">
        <Link href="/dashboard" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-teal-400 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al Inicio
        </Link>
        <h1 className="text-3xl font-black italic tracking-tight text-foreground uppercase leading-none">Mi Perfil</h1>
        <p className="text-xs text-muted-foreground font-bold uppercase">Gestión y visualización de credenciales y activos registrados ante el ICA.</p>
      </div>
    </div>
  )
}

export function ProfileError({ error }: { error: string | null }) {
  if (!error) return null

  return (
    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-sm font-bold">
      <AlertCircle className="w-5 h-5 flex-shrink-0" />
      <span>{error}</span>
    </div>
  )
}

interface ProfileSidebarProps {
  profileData: FullUserProfile | null
  displayName: string
  displayStatus: string
  initials: string
  isUploading: boolean
  showCameraModal: boolean
  cameraStream: MediaStream | null
  pendingPhotoBase64: string | null
  onPhotoClick: () => void
  onPhotoUpload: (e: ChangeEvent<HTMLInputElement>) => void
  onStartCamera: () => void
  onStopCamera: () => void
  onCapturePhoto: () => void
  onConfirmPhoto: () => void
  onCancelPhoto: () => void
  onDeletePhoto: () => void
}

export function ProfileSidebar({
  profileData,
  displayName,
  displayStatus,
  initials,
  isUploading,
  showCameraModal,
  cameraStream,
  pendingPhotoBase64,
  onPhotoClick,
  onPhotoUpload,
  onStartCamera,
  onStopCamera,
  onCapturePhoto,
  onConfirmPhoto,
  onCancelPhoto,
  onDeletePhoto,
}: ProfileSidebarProps) {
  const hasPhoto = !!profileData?.foto_perfil

  return (
    <div className="lg:col-span-1 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="bg-card/40 border-2 border-border rounded-3xl overflow-hidden shadow-xl relative">
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-primary/20 to-indigo-600/20 blur-xl -z-10" />
          <CardContent className="px-4 py-8 flex flex-col items-center text-center space-y-6">

            {/* Avatar con botón de eliminar */}
            <div className="relative">
              <div className="group relative w-32 h-32 rounded-full bg-gradient-to-br from-primary to-indigo-600 p-1 shadow-xl shadow-primary/10 cursor-pointer hover:scale-105 transition-all">
                <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden border-2 border-background/50">
                  {profileData?.foto_perfil ? (
                    <Image src={profileData?.foto_perfil} className="w-full h-full object-cover" alt="Profile" width={128} height={128} />
                  ) : (
                    <span className="text-4xl font-black italic tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">{initials}</span>
                  )}
                </div>
                {isUploading && (
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                )}
              </div>

              {/* Botón eliminar foto — solo visible si hay foto */}
              {hasPhoto && !isUploading && (
                <button
                  onClick={onDeletePhoto}
                  title="Eliminar foto de perfil"
                  className="absolute -bottom-1 -right-1 w-9 h-9 bg-rose-500 hover:bg-rose-600 text-foreground rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 transition-all hover:scale-110 active:scale-95 border-2 border-background"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={onPhotoUpload} />

            <div className="space-y-2">
              <h2 className="text-2xl font-black italic tracking-tight text-foreground uppercase leading-tight">{displayName}</h2>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Badge className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${displayStatus === "activo"
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                  }`}>
                  <span className={`w-2 h-2 rounded-full mr-2 inline-block ${displayStatus === "activo" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                  {displayStatus}
                </Badge>
              </div>
            </div>

            <div className="w-full border-t border-border/80" />

            <div className="grid grid-cols-2 gap-3 w-full">
              <button onClick={onPhotoClick} className="bg-muted hover:bg-muted/80 text-muted-foreground p-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all border border-border/50">
                <Plus className="w-5 h-5 text-primary" />
                <span className="text-[10px] font-black uppercase">Subir</span>
              </button>
              <button onClick={onStartCamera} className="bg-primary/5 hover:bg-primary/10 text-primary p-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all border border-primary/20">
                <Camera className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase">Cámara</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <PhotoConfirmModal
        pendingPhotoBase64={pendingPhotoBase64}
        hasExistingPhoto={hasPhoto}
        isUploading={isUploading}
        onConfirm={onConfirmPhoto}
        onCancel={onCancelPhoto}
      />

      <CameraModal
        isOpen={showCameraModal}
        cameraStream={cameraStream}
        isUploading={isUploading}
        onStopCamera={onStopCamera}
        onCapturePhoto={onCapturePhoto}
      />

      <ProtectedNotice />
    </div>
  )
}

// ─── Modal de Confirmación de Foto ────────────────────────────────────────────
export function PhotoConfirmModal({
  pendingPhotoBase64,
  hasExistingPhoto,
  isUploading,
  onConfirm,
  onCancel,
}: {
  pendingPhotoBase64: string | null
  hasExistingPhoto: boolean
  isUploading: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!pendingPhotoBase64) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
        onClick={onCancel}
      />
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative bg-card border-2 border-border rounded-[2.5rem] overflow-hidden shadow-2xl max-w-md w-full"
      >
        {/* Header */}
        <div className={`p-6 flex items-center justify-between ${hasExistingPhoto ? 'bg-amber-500' : 'bg-primary'}`}>
          <div className="flex items-center gap-3">
            {hasExistingPhoto
              ? <RefreshCw className="text-foreground w-6 h-6" />
              : <CheckCircle2 className="text-foreground w-6 h-6" />
            }
            <div>
              <h3 className="text-foreground font-black italic uppercase tracking-tighter leading-tight">
                {hasExistingPhoto ? 'Reemplazar Foto' : 'Confirmar Foto'}
              </h3>
              <p className="text-foreground/70 text-xs">
                {hasExistingPhoto ? 'Esta acción reemplazará tu foto actual' : 'Revisa tu foto antes de guardar'}
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="text-foreground/80 hover:text-foreground"><X /></button>
        </div>

        {/* Preview */}
        <div className="p-6 space-y-5">
          <div className="flex justify-center">
            <div className="w-56 h-56 max-w-[75vw] max-h-[75vw] rounded-full overflow-hidden border-4 border-border shadow-xl ring-4 ring-primary/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pendingPhotoBase64} alt="Preview" className="w-full h-full object-cover" />
            </div>
          </div>

          {hasExistingPhoto && (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
              <ImageOff className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-amber-600 dark:text-amber-400 text-xs font-semibold">
                Tu foto de perfil anterior será eliminada permanentemente.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 h-12 bg-muted text-muted-foreground font-black uppercase rounded-2xl border border-border text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={isUploading}
              className={`flex-[2] h-12 text-foreground font-black uppercase rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all text-sm ${hasExistingPhoto
                ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                : 'bg-primary hover:bg-primary/90 shadow-primary/20'
                }`}
            >
              {isUploading
                ? <Loader2 className="animate-spin w-5 h-5" />
                : <>{hasExistingPhoto ? <RefreshCw className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />} GUARDAR</>
              }
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function CameraModal({
  isOpen,
  cameraStream,
  isUploading,
  onStopCamera,
  onCapturePhoto,
}: {
  isOpen: boolean
  cameraStream: MediaStream | null
  isUploading: boolean
  onStopCamera: () => void
  onCapturePhoto: () => void
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={onStopCamera} />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-card border-2 border-border rounded-[2.5rem] overflow-hidden shadow-2xl max-w-md w-full">
        <div className="bg-primary p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Camera className="text-foreground w-6 h-6" />
            <h3 className="text-foreground font-black italic uppercase tracking-tighter">Capturar Perfil</h3>
          </div>
          <button onClick={onStopCamera} className="text-foreground/80 hover:text-foreground"><X /></button>
        </div>
        <div className="p-6 space-y-6">
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-black border-4 border-muted">
            <video id="camera-preview" autoPlay playsInline muted ref={el => { if (el && cameraStream) el.srcObject = cameraStream }} className="w-full h-full object-cover scale-x-[-1]" />
          </div>
          <div className="flex gap-4">
            <button onClick={onStopCamera} className="flex-1 h-14 bg-muted text-muted-foreground font-black uppercase rounded-2xl border border-border">Cancelar</button>
            <button onClick={onCapturePhoto} disabled={isUploading} className="flex-[2] h-14 bg-primary text-foreground font-black uppercase rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
              {isUploading ? <Loader2 className="animate-spin" /> : <><RotateCw className="w-5 h-5" /> CAPTURAR</>}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function ProtectedNotice() {
  return (
    <Card className="bg-background/30 border border-border rounded-3xl p-5">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-foreground text-xs font-black uppercase tracking-wider">Entorno Protegido</h4>
          <p className="text-[11px] text-muted-foreground leading-relaxed">Este perfil está encriptado con protocolos SSL y resguardado bajo control de acceso de roles del Instituto Colombiano Agropecuario (ICA).</p>
        </div>
      </div>
    </Card>
  )
}

export function GeneralInfoCard({
  displayName,
  displayDocument,
  displayEmail,
}: {
  displayName: string
  displayDocument: string
  displayEmail: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card className="bg-card/40 border-2 border-border rounded-3xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="text-md font-black italic tracking-widest text-muted-foreground uppercase flex items-center gap-2">
            <User className="w-5 h-5 text-teal-500" /> Información Personal
          </h3>
        </div>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <p className="text-[10px] text-teal-500 font-black uppercase tracking-widest flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Nombre Completo
            </p>
            <p className="text-foreground font-bold text-sm bg-background/40 border border-border/80 p-3 rounded-2xl">
              {displayName}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] text-teal-500 font-black uppercase tracking-widest flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Número de Documento (Cédula)
            </p>
            <p className="text-foreground font-bold text-sm bg-background/40 border border-border/80 p-3 rounded-2xl">
              {displayDocument}
            </p>
          </div>

          <div className="space-y-1 md:col-span-2">
            <p className="text-[10px] text-teal-500 font-black uppercase tracking-widest flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Correo Electrónico
            </p>
            <p className="text-foreground font-bold text-sm bg-background/40 border border-border/80 p-3 rounded-2xl font-mono">
              {displayEmail}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function ProducerStatsSection({ producerStats }: { producerStats: ProducerStats }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={<Building2 className="w-6 h-6" />} tone="teal" label="Predios Registrados" value={producerStats.predios} suffix="Predios" />
        <StatCard icon={<ClipboardList className="w-6 h-6" />} tone="indigo" label="Visitas Técnicas Totales" value={producerStats.inspecciones} suffix="Inspecciones" />
        <StatCard icon={<Sprout className="w-6 h-6 animate-pulse" />} tone="rose" label="Inspecciones Activas" value={producerStats.inspeccionesActivas} suffix="Activas" showPulse={producerStats.inspeccionesActivas > 0} />
      </div>
    </motion.div>
  )
}

export function TecnicoStatsSection({ tecnicoStats, profileData }: { tecnicoStats: TecnicoStats; profileData: FullUserProfile | null }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={<ClipboardList className="w-6 h-6" />} tone="teal" label="Inspecciones Asignadas Totales" value={tecnicoStats.asignadas} suffix="Asignadas" />
        <StatCard icon={<CheckCircle2 className="w-6 h-6" />} tone="emerald" label="Inspecciones Realizadas" value={tecnicoStats.finalizadas} suffix="Realizadas" />
        <StatCard icon={<Activity className="w-6 h-6 animate-pulse" />} tone="amber" label="Inspecciones Activas" value={tecnicoStats.activas} suffix="Activas" showPulse={tecnicoStats.activas > 0} />
      </div>

      <div className="space-y-4 text-left">
        <h3 className="text-xs font-black italic tracking-widest text-muted-foreground uppercase flex items-center gap-2 mt-6">
          <MapPin className="w-4 h-4 text-teal-500" /> Area Geográfica de Control ICA
        </h3>

        <Card className="bg-card/40 border-2 border-border rounded-3xl overflow-hidden shadow-lg hover:border-slate-700/80 transition-all text-left">
          <PanelHeader icon={<MapPin className="w-5 h-5" />} title="Región de Asignación Fitosanitaria" badge="Técnico Oficial ICA" badgeClassName="text-teal-400 border-teal-500/20" />
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoBlock label="Departamento" value={profileData?.region?.departamento} />
            <InfoBlock label="Municipio Sede" value={profileData?.region?.municipio} />
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}

export function AdminStatsSection({ adminStats }: { adminStats: AdminStats }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={<User className="w-6 h-6" />} tone="teal" label="Usuarios Registrados" value={adminStats.totalUsuarios} suffix="Usuarios" />
        <StatCard icon={<CheckCircle2 className="w-6 h-6" />} tone="emerald" label="Cuentas Activas" value={adminStats.activos} suffix="Activas" />
        <StatCard icon={<Shield className="w-6 h-6" />} tone="indigo" label="Técnicos Oficiales" value={adminStats.tecnicos} suffix="Técnicos" />
      </div>

      <div className="space-y-4 text-left">
        <h3 className="text-xs font-black italic tracking-widest text-muted-foreground uppercase flex items-center gap-2 mt-6">
          <Shield className="w-4 h-4 text-teal-500" /> Panel de Control de Seguridad del Sistema
        </h3>

        <Card className="bg-card/40 border-2 border-border rounded-3xl overflow-hidden shadow-lg hover:border-slate-700/80 transition-all text-left">
          <PanelHeader icon={<Shield className="w-5 h-5" />} title="Autorización del Sistema (Nivel Root)" badge="Administrador Global" badgeClassName="text-rose-400 border-rose-500/20" />
          <CardContent className="p-6 space-y-4">
            <InfoBlock label="Nivel de Acceso" value="Administración del Sistema ICA - Control Total del Registro de Predios, Usuarios e Inspecciones Fitosanitarias." textClassName="text-xs" />

            <div>
              <h5 className="text-[10px] text-teal-500 font-black uppercase tracking-widest mb-1">Funciones del Rol</h5>
              <ul className="text-muted-foreground text-xs font-semibold bg-background/30 p-4 rounded-2xl border border-border/50 space-y-1.5 list-disc list-inside">
                <li>Aprobación y denegación de cuentas de técnicos y productores.</li>
                <li>Auditoría forense de todas las operaciones realizadas en el sistema.</li>
                <li>Configuración geográfica global de regiones y municipios de control.</li>
                <li>Gestión y catalogación de plagas fitosanitarias.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}

export function ProductionPlacesSection({
  lugares,
  displayName,
  displayDocument,
  profileData,
}: {
  lugares: ProductionPlace[]
  displayName: string
  displayDocument: string
  profileData: FullUserProfile | null
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="space-y-4 text-left"
    >
      <h3 className="text-xs font-black italic tracking-widest text-muted-foreground uppercase flex items-center gap-2 mt-4">
        <Building2 className="w-4 h-4 text-teal-500" /> Lugar de Producción / Empresa Registrada
      </h3>

      {lugares.length === 0 ? (
        <Card className="bg-card/20 border border-border/80 rounded-2xl p-6 text-center">
          <Building2 className="w-10 h-10 text-muted-foreground/70 mx-auto mb-3" />
          <p className="text-sm font-bold text-muted-foreground">No tienes lugares de producción registrados.</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Registra tu empresa o finca en la sección de Predios para verla aquí.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {lugares.map((lugar) => {
            const linkedPredios = lugar.predio || []
            const totalHectareas = linkedPredios.reduce((sum, p) => sum + (Number(p.area_hectareas) || 0), 0)

            return (
              <Card key={lugar.id_lugar_produccion} className="bg-card/40 border-2 border-border rounded-3xl overflow-hidden shadow-lg hover:border-slate-700/80 transition-all text-left">
                <PanelHeader icon={<Building2 className="w-5 h-5" />} title={lugar.nombre_lugar} badge={`Registro ICA: ${lugar.numero_registro || "Pendiente Asignación"}`} badgeClassName="text-teal-400 border-teal-500/20" />

                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <InfoBlock label="Empresa / Productor Responsable" value={displayName} />
                      <InfoBlock label="Identificación del Propietario" value={displayDocument} />
                    </div>

                    <div className="space-y-4">
                      <InfoBlock label="Cobertura Física Total" value={`${totalHectareas} Hectáreas en ${linkedPredios.length} Predio(s)`} />
                      <InfoBlock
                        label="Departamento / Municipio Principal"
                        value={`${linkedPredios[0]?.region?.departamento || profileData?.region?.departamento || "N/A"} - ${linkedPredios[0]?.region?.municipio || profileData?.region?.municipio || "N/A"}`}
                      />
                    </div>
                  </div>

                  {linkedPredios.length > 0 && <LinkedPredios predios={linkedPredios} profileData={profileData} />}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

function StatCard({
  icon,
  tone,
  label,
  value,
  suffix,
  showPulse = false,
}: {
  icon: ReactNode
  tone: "teal" | "indigo" | "rose" | "emerald" | "amber"
  label: string
  value: number
  suffix: string
  showPulse?: boolean
}) {
  const toneClasses = {
    teal: "hover:border-teal-500/30 bg-teal-500/10 text-teal-400 bg-teal-500",
    indigo: "hover:border-indigo-500/30 bg-indigo-500/10 text-indigo-400 bg-indigo-500",
    rose: "hover:border-rose-500/30 bg-rose-500/10 text-rose-400 bg-rose-500",
    emerald: "hover:border-emerald-500/30 bg-emerald-500/10 text-emerald-400 bg-emerald-500",
    amber: "hover:border-amber-500/30 bg-amber-500/10 text-amber-400 bg-amber-500",
  }[tone].split(" ")

  return (
    <Card className={`bg-card/30 border border-border/80 rounded-2xl ${toneClasses[0]} transition-all`}>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`p-3.5 ${toneClasses[1]} rounded-2xl ${toneClasses[2]} relative`}>
          {icon}
          {showPulse && <span className={`absolute top-1 right-1 w-2.5 h-2.5 ${toneClasses[3]} rounded-full border-2 border-slate-950`} />}
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">{label}</p>
          <h4 className="text-2xl font-black italic tracking-tight text-foreground">{value} <span className="text-xs font-bold not-italic text-muted-foreground">{suffix}</span></h4>
        </div>
      </CardContent>
    </Card>
  )
}

function PanelHeader({
  icon,
  title,
  badge,
  badgeClassName,
}: {
  icon: ReactNode
  title: string
  badge: string
  badgeClassName: string
}) {
  return (
    <div className="bg-gradient-to-r from-teal-600/10 to-indigo-600/10 px-6 py-4 border-b border-border/80 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-teal-500/10 rounded-xl text-teal-400">
          {icon}
        </div>
        <div>
          <h4 className="text-lg font-black italic tracking-tight text-foreground uppercase">{title}</h4>
        </div>
      </div>
      <Badge className={`bg-background/80 border font-mono text-xs px-3 py-1 rounded-full ${badgeClassName}`}>
        {badge}
      </Badge>
    </div>
  )
}

function InfoBlock({ label, value, textClassName = "text-sm" }: { label: string; value?: ReactNode; textClassName?: string }) {
  return (
    <div>
      <h5 className="text-[10px] text-teal-500 font-black uppercase tracking-widest mb-1">{label}</h5>
      <p className={`text-foreground ${textClassName} font-bold bg-background/30 p-3 rounded-2xl border border-border/50`}>
        {value}
      </p>
    </div>
  )
}

function LinkedPredios({ predios, profileData }: { predios: PredioInfo[]; profileData: FullUserProfile | null }) {
  return (
    <div className="space-y-3 pt-2">
      <h5 className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Predios de Terreno Vinculados a esta Empresa</h5>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {predios.map((predio) => {
          const veredaName = predio.region?.vereda?.trim() || profileData?.region?.vereda?.trim() || "Vereda General"
          const municipioName = predio.region?.municipio || profileData?.region?.municipio || "Manzanares"
          const departamentoName = predio.region?.departamento || profileData?.region?.departamento || "Caldas"

          return (
            <div key={predio.id_predio} className="bg-background/40 border border-border p-4 rounded-2xl hover:border-slate-700/60 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase italic tracking-tight text-foreground">{predio.nombre_predio}</span>
                <Badge className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[9px] font-black uppercase">
                  {predio.area_hectareas} Ha
                </Badge>
              </div>
              <div className="text-[11px] text-muted-foreground space-y-1">
                <p className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 font-bold inline" /> Numero Predial: <span className="font-mono text-muted-foreground font-semibold">{predio.numero_predial || "No registrado"}</span></p>
                <p className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 inline" />
                  Ubicación: <span className="text-muted-foreground font-semibold">{veredaName} ({municipioName} - {departamentoName})</span>
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

}


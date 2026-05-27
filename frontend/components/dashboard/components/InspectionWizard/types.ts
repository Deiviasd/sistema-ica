export interface EvidencePhoto {
  url: string
  sincronizado: boolean
  id_temporal?: string
  id_remoto?: string | number
}

export type ToastType = "success" | "error"

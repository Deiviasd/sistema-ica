import { EnrichedInspection } from "@/app/dashboard/historial-registros/historialtipos"

export type ModalMode = "view" | "edit" | "delete"

export interface SelectedModal {
    inspection: EnrichedInspection
    mode: ModalMode
}

export interface FilterOption {
    id: string
    nombre: string
}

export interface FilterOptions {
    predios: FilterOption[]
    lugares: FilterOption[]
    lotes: FilterOption[]
}

export interface DetalleEditado {
    id_detalle?: number | string
    siembra_id?: number | string
    plaga_id: string
    plaga_nombre: string
    cantidad_plantas_afectadas: number
    plantas_totales: number
    porcentaje_infestacion: number
    lote_nombre: string
    cultivo: string
    recomendacion: string
    nota: string
}

export interface DetallePayload {
    id_detalle?: number | string
    siembra_id?: number | string
    plaga_id: number | null
    cantidad_plantas_afectadas: number
    plantas_totales: number
    porcentaje_infestacion: number
    observaciones_especificas: string
}

// Re-exports para que page.tsx solo importe de aquí
export type {
    RawPredia,
    RawLote,
    RawSiembra,
    RawPlaga,
    DetalleEnriquecido,
    EnrichedInspection
} from "@/app/dashboard/historial-registros/historialtipos"
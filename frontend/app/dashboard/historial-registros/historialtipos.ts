import { LugarProduccion, Inspection } from "@/components/dashboard/types/inspection"

export interface RawPredia {
    id_predio: number | string
    nombre_predio: string
    id_lugar_produccion?: number | string
    lugar_produccion?: LugarProduccion
    lote?: RawLote[]
}

export interface RawLote {
    id_lote: number | string
    nombre_lote: string
    id_predio?: number | string
}

export interface RawSiembra {
    id_siembra: number | string
    id_lote?: number | string
    especie?: string
    variedad?: { especie?: { nombre_comun?: string } }
}

export interface RawPlaga {
    id_plaga: number | string
    nombre_comun?: string
}

export interface DetalleEnriquecido {
    siembra_id?: number | string
    plaga_id?: number | string
    observaciones_especificas?: string
    plaga?: string
    siembra?: RawSiembra
    lote?: RawLote & { id_predio?: number | string }
    lote_id: string | null
    predio_id: string
    lote_nombre: string | null
    cultivo: string | null
    plaga_nombre: string | null
}

export interface EnrichedInspection extends Inspection {
    lugar_nombre: string
    predio_nombre: string
    lotes_inspeccionados: string[]
    cultivos_evaluados: string[]
    plagas_identificadas: string[]
    observaciones: string
    detalles_enriquecidos: DetalleEnriquecido[]
}
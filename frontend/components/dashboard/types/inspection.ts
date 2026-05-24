export interface SiembraActiva {
  id_siembra: number
  id_especie?: number
  especie?: string
  variedad?: string
  ciclo?: string
  fecha_siembra?: string
  cantidad_plantas?: number
  edad_dias?: number
}

export interface Lote {
  id_lote: string | number
  nombre_lote: string
  area: number | string
  estado_lote?: string
  estado?: string
  siembra_activa?: SiembraActiva | null
}

export interface PredioRegion {
  departamento?: string
  municipio?: string
  vereda?: string
}

export interface Predio {
  id_predio: number | string
  nombre_predio: string
  numero_predial?: string
  area_hectareas?: number | string
  latitud?: string | number
  longitud?: string | number
  region?: PredioRegion
  lotes?: Lote[]
}

export interface LugarProduccion {
  id_lugar_produccion?: number
  nombre_lugar: string
  nombre_empresa?: string
  numero_predial: string
  numero_registro?: string
  ubicacion?: string
  es_lugar_inspeccion?: boolean
  predios?: Predio[]
  lotes?: Lote[]
}

export interface Inspection {
  id_inspeccion: string
  tecnico_id: number
  productor_id: number
  id_lugar_produccion: number
  fecha_programada: string
  estado: 'programada' | 'en_proceso' | 'finalizada' | 'cancelada'
  observaciones_generales?: string
  lugar_produccion: LugarProduccion
  id_predio?: number | string
  tecnico_nombre?: string
}

export interface EvalItem {
  id_detalle?: number
  id_lote: string
  id_lugar_produccion?: number | null
  siembra: SiembraActiva | null
  plaga: string
  totales: number
  afectadas: number
  porcentaje?: number
  recomendacion: string
  nota: string
}

export interface FormData {
  generalObs: string
  evaluations: EvalItem[]
}

export interface Productor {
  nombre: string
  ubicacion?: string
}

export interface HallazgoPrevio {
  id_detalle?: number
  id_lote?: string | number
  siembra_id?: number
  cantidad_plantas_afectadas?: number
  plantas_totales?: number
  porcentaje_infestacion?: number
  plaga?: string
  observaciones_especificas: string
}

export interface ContextoInspeccion {
  productor?: Productor
  lugares_produccion?: LugarProduccion[]
  id_lugar_produccion?: number
  hallazgos_previos?: HallazgoPrevio[]
  tecnico_nombre?: string
  lugar_nombre?: string
  area_lugar?: number | string
}

export interface Plaga {
  id_plaga: number
  nombre_comun: string
  nombre_cientifico?: string
  id_especie?: number
}


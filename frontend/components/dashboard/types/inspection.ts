export interface Inspection {
  id_inspeccion: string
  tecnico_id: number
  productor_id: number
  id_lugar_produccion: number
  fecha_programada: string
  estado: 'programada' | 'en_proceso' | 'finalizada'
  observaciones_generales?: string
  lugar_produccion: {
    nombre_lugar: string
    numero_predial: string
    ubicacion?: string
  }
}

export interface EvalItem {
  id_detalle?: number
  id_lote: string
  id_lugar_produccion?: number | null
  siembra: any
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

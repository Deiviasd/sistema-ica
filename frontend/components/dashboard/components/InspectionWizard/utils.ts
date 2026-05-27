import { SiembraActiva } from "../../types/inspection"

export const getVariedadNombre = (siembra?: SiembraActiva | null) => {
  if (!siembra?.variedad) return siembra?.variedad_nombre || "Genérica"
  return typeof siembra.variedad === "string" ? siembra.variedad : siembra.variedad.nombre_variedad || "Genérica"
}

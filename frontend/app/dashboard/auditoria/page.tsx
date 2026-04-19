"use client"
import { motion } from "framer-motion"

export default function AuditoriaPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-3xl font-bold">Logs de Auditoría</h1>
      <p className="text-muted-foreground mt-2">Módulo en construcción...</p>
    </motion.div>
  )
}

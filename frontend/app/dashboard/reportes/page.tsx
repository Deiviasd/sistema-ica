"use client"
import { motion } from "framer-motion"

export default function ReportesPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-3xl font-bold">Reportes Técnicos</h1>
      <p className="text-muted-foreground mt-2">Módulo en construcción...</p>
    </motion.div>
  )
}

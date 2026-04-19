"use client"
import { motion } from "framer-motion"

export default function PrediosPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-3xl font-bold">Mis Predios</h1>
      <p className="text-muted-foreground mt-2">Módulo en construcción...</p>
    </motion.div>
  )
}

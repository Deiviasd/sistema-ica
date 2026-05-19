"use client"
import { useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { useUserStore } from "@/lib/store"

export default function InspeccionesPage() {
  const { user } = useUserStore()
  const router = useRouter()

  // 🛡️ Protección de Ruta por Roles (Solo Tecnicos y Admin)
  useEffect(() => {
    if (user && user.role !== "tecnico" && user.role !== "admin") {
      router.push("/dashboard")
    }
  }, [user, router])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-3xl font-bold">Inspecciones Asignadas</h1>
      <p className="text-muted-foreground mt-2">Módulo en construcción...</p>
    </motion.div>
  )
}

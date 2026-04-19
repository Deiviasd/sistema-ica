"use client"

import { useAuth } from "@/hooks/useAuth"
import { Sidebar } from "@/components/layout/Sidebar"
import { Topbar } from "@/components/layout/Topbar"
import { motion, AnimatePresence } from "framer-motion"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isLoading, user } = useAuth()

  // Pantalla de carga hermosa
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="w-16 h-16 rounded-2xl bg-primary shadow-lg shadow-primary/30 flex flex-col items-center justify-center text-primary-foreground font-bold"
          >
            ICA
          </motion.div>
          <p className="text-muted-foreground animate-pulse font-medium tracking-wide">Cargando plataforma...</p>
        </div>
      </div>
    )
  }

  // Si no hay usuario y no está cargando, el hook useAuth lo redirigirá a login.
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background/50 dark:bg-background/95">
      <Sidebar />
      <div className="pl-64 flex flex-col min-h-screen transition-all">
        <Topbar />
        <AnimatePresence mode="wait">
          <motion.main 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1 p-8"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  )
}

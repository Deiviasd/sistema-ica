"use client"

import { useUserStore } from "@/lib/store"
import { motion } from "framer-motion"
import { Leaf, FileCheck, ShieldAlert } from "lucide-react"

export default function Dashboard() {
  const { user } = useUserStore()

  if (!user) return null

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Buenos días"
    if (hour < 18) return "Buenas tardes"
    return "Buenas noches"
  }

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {getGreeting()}, <span className="text-primary">{user.email.split('@')[0]}</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Bienvenido a tu panel de control {user.role}.
          </p>
        </div>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {user.role === 'admin' && (
          <DashboardCard
            title="Aprobaciones Pendientes"
            value="3"
            icon={<ShieldAlert className="w-8 h-8 text-amber-500" />}
            color="bg-amber-500/10 border-amber-500/20"
            delay={0.1}
          />
        )}
        
        {user.role === 'productor' && (
          <>
            <DashboardCard
              title="Mis Predios"
              value="2"
              icon={<Leaf className="w-8 h-8 text-green-500" />}
              color="bg-green-500/10 border-green-500/20"
              delay={0.1}
            />
            <DashboardCard
              title="Siembras Activas"
              value="5"
              icon={<Leaf className="w-8 h-8 text-emerald-500" />}
              color="bg-emerald-500/10 border-emerald-500/20"
              delay={0.2}
            />
          </>
        )}

        {user.role === 'tecnico' && (
          <DashboardCard
            title="Inspecciones Asignadas"
            value="8"
            icon={<FileCheck className="w-8 h-8 text-blue-500" />}
            color="bg-blue-500/10 border-blue-500/20"
            delay={0.1}
          />
        )}
      </div>
    </div>
  )
}

function DashboardCard({ title, value, icon, color, delay }: { title: string, value: string, icon: React.ReactNode, color: string, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring" }}
      className={`p-6 rounded-3xl border ${color} bg-card/60 backdrop-blur-sm flex items-start gap-4 shadow-sm hover:shadow-md transition-all`}
    >
      <div className="p-3 bg-background/50 rounded-2xl shadow-sm">
        {icon}
      </div>
      <div>
        <h3 className="text-muted-foreground font-medium text-sm mb-1">{title}</h3>
        <p className="text-4xl font-bold tracking-tight text-foreground">{value}</p>
      </div>
    </motion.div>
  )
}
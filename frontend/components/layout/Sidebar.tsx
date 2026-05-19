"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { useUserStore } from "@/lib/store"
import {
  Users, Leaf, FileText, ClipboardCheck, LayoutDashboard,
  Map, Sprout, FileStack, Calendar
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useUserStore()
  const role = user?.role || 'guest'

  // Configuración de rutas por rol
  const routes = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "productor", "tecnico"] },
    { name: "Usuarios Pendientes", href: "/dashboard/usuarios", icon: Users, roles: ["admin"] },
    { name: "Auditoría", href: "/dashboard/auditoria", icon: FileText, roles: ["admin"] },
    { name: "Predios", href: "/dashboard/predios", icon: Map, roles: ["productor"] },
    { name: "Lotes y Siembras", href: "/dashboard/siembras", icon: Sprout, roles: ["productor"] },
    { name: "Agendar Inspección", href: "/dashboard/inspecciones/agendar", icon: Calendar, roles: ["productor", "admin"] },
    { name: "Registro Integral", href: "/dashboard/registro-integral", icon: Leaf, roles: ["productor"] },
    { name: "Inspecciones", href: "/dashboard/inspecciones", icon: ClipboardCheck, roles: ["tecnico"] },
    { name: "Reportes", href: "/dashboard/reportes", icon: FileStack, roles: ["tecnico"] },
  ]

  const allowedRoutes = routes.filter(r => r.roles.includes(role.toLowerCase()))

  return (
    <>
      <motion.aside
        initial={{ x: -260 }}
        animate={{ x: isOpen || typeof window !== 'undefined' && window.innerWidth >= 768 ? 0 : -260 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={cn(
          "w-64 h-screen border-r border-border/50 bg-card/60 backdrop-blur-xl flex flex-col p-4 fixed left-0 top-0 z-50 transition-colors",
          isOpen ? "shadow-2xl" : ""
        )}
      >
        <div className="mb-8 mt-2 px-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/20">
              ICA
            </div>
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-green-500">
              ICA Hub
            </h2>
          </div>
          {/* Botón cerrar para móvil */}
          <button onClick={onClose} className="p-2 md:hidden text-muted-foreground hover:bg-muted rounded-lg">
             <LayoutDashboard className="w-5 h-5 rotate-45" /> {/* Usando un icono temporal como X o simplemente un botón */}
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 flex flex-col">
          {allowedRoutes.map((route) => {
            const isActive = pathname === route.href
            return (
              <Link key={route.name} href={route.href} onClick={() => onClose && onClose()}>
                <div
                  className={cn(
                    "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group overflow-hidden",
                    isActive
                      ? "text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-bg"
                      className="absolute inset-0 bg-primary/10 dark:bg-primary/20 -z-10"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <route.icon className={cn("w-5 h-5", isActive ? "text-primary" : "group-hover:scale-110 transition-transform")} />
                  <span>{route.name}</span>
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto px-4 py-4 rounded-xl bg-muted/40 border border-border/30 text-sm">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Tu Rol</p>
          <p className="capitalize font-medium text-foreground">{role}</p>
        </div>
      </motion.aside>
    </>
  )
}

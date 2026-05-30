"use client"

import { useUserStore } from "@/lib/store"
import { useAuth } from "@/hooks/useAuth"
import { ThemeToggle } from "./ThemeToggle"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogOut, User, Menu, Sun, Moon } from "lucide-react"

interface TopbarProps {
  onMenuClick?: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user } = useUserStore()
  const { handleLogout } = useAuth()

  if (!user) return null



  // Iniciales para el avatar
  const initials = user.email.substring(0, 2).toUpperCase()

  return (
    <header className="flex items-center justify-end px-3 py-2 fixed top-0 right-0 z-50">


      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full ring-offset-background transition-all hover:ring-2 hover:ring-border hover:ring-offset-2">
            <Avatar className="h-10 w-10 border-2 border-primary/50 shadow-sm">
              <AvatarImage src={(user as any).foto_perfil} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-medium">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2 rounded-xl bg-card/80 backdrop-blur-xl border border-border/50 shadow-xl p-2">
            <div className="flex flex-col space-y-1 p-2">
              <p className="text-sm font-medium leading-none">{user.email}</p>
              <p className="text-xs leading-none text-muted-foreground capitalize">
                Rol: {user.role}
              </p>
            </div>
            <DropdownMenuSeparator className="bg-border/50" />

            <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-3 py-2 hover:bg-muted focus:bg-muted transition-colors">
              <Link href="/dashboard/perfil" className="flex items-center w-full">
                <User className="mr-2 h-4 w-4" />
                <span>Mi Perfil</span>
              </Link>
            </DropdownMenuItem>

            {/* Selector de Tema en el Dropdown */}
            <div className="flex items-center justify-between px-3 py-2 hover:bg-muted rounded-lg transition-colors cursor-pointer" onClick={() => (document.getElementById('theme-trigger') as HTMLElement)?.click()}>
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-400" />
                <span className="text-sm">Cambiar Tema</span>
              </div>
              <div id="theme-trigger">
                <ThemeToggle />
              </div>
            </div>

            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-destructive focus:text-destructive rounded-lg px-3 py-2 hover:bg-destructive/10 focus:bg-destructive/10 transition-colors mt-1"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

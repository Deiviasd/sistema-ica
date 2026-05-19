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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LogOut, User, Menu } from "lucide-react"

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
    <header className="h-16 border-b border-border/50 bg-background/60 backdrop-blur-md flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 transition-all">
      <div className="flex items-center gap-4">
        {/* Botón menú móvil */}
        <button 
          onClick={onMenuClick}
          className="p-2 -ml-2 text-muted-foreground hover:bg-muted rounded-lg md:hidden transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        
        <h1 className="text-xl font-bold tracking-tight text-foreground/90 hidden sm:block">
          Panel de Control
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        <ThemeToggle />
        
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full ring-offset-background transition-all hover:ring-2 hover:ring-border hover:ring-offset-2">
            <Avatar className="h-9 w-9 border border-border/50 shadow-sm">
              <AvatarFallback className="bg-primary/10 text-primary font-medium">{initials}</AvatarFallback>
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

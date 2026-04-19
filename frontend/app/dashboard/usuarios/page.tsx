"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { motion } from "framer-motion"
import { Check, X, ShieldAlert, User, Mail, Calendar } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface PendingUser {
  id_usuario: string
  nombre: string
  correo: string
  id_rol: string
  id_region: string
  fecha_registro: string
  estado: string
}

export default function UsuariosPendientes() {
  const [users, setUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUsers = async () => {
    try {
      const res = await api.get("/auth/users/pending")
      setUsers(res.data)
    } catch (error) {
      console.error("Error al cargar usuarios", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/auth/users/${id}/status`, { estado: newStatus })
      // Remover de la lista
      setUsers((prev) => prev.filter((u) => u.id_usuario !== id))
    } catch (error) {
      console.error("Error al actualizar usuario", error)
    }
  }

  if (loading) {
    return <div className="text-muted-foreground animate-pulse mt-10">Cargando usuarios pendientes...</div>
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-primary" />
          Aprobación de Usuarios
        </h1>
        <p className="text-muted-foreground">
          Gestione y autorice los accesos de nuevos técnicos y productores al sistema.
        </p>
      </motion.div>

      {users.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <User className="w-12 h-12 mb-4 opacity-20" />
            <p>No hay usuarios pendientes de aprobación en este momento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {users.map((user, index) => (
            <motion.div
              key={user.id_usuario}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-card/60 backdrop-blur-xl border-border/50 shadow-sm hover:shadow-md transition-all overflow-hidden relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                <CardHeader className="pb-3 pt-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{user.nombre}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1 text-xs">
                        <Mail className="w-3 h-3" />
                        {user.correo}
                      </CardDescription>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                      {user.id_rol.toLowerCase()}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground w-16">Región:</span>
                      <span className="capitalize">{user.id_region?.toLowerCase() || 'Sin región'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground w-16">Registro:</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(user.fecha_registro).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleUpdateStatus(user.id_usuario, "activo")}
                      className="flex-1 bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:text-green-700 shadow-none"
                    >
                      <Check className="w-4 h-4 mr-1.5" /> Aprobar
                    </Button>
                    <Button
                      onClick={() => handleUpdateStatus(user.id_usuario, "rechazado")}
                      variant="outline"
                      className="flex-1 text-destructive border-destructive/20 hover:bg-destructive/10 hover:border-destructive/30"
                    >
                      <X className="w-4 h-4 mr-1.5" /> Rechazar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

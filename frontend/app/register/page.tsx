"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import api from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import { UserPlus, Mail, Lock, User, IdCard, MapPin, Briefcase, Loader2, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

const ROLES = [
  { id: "TECNICO", name: "Técnico Inspector" },
  { id: "PRODUCTOR", name: "Productor Agrícola" }
]

const REGIONES = [
  { id: "REG-001", name: "Antioquia" },
  { id: "REG-002", name: "Cundinamarca" },
  { id: "REG-003", name: "Valle del Cauca" },
  { id: "REG-004", name: "Tolima" },
  { id: "REG-005", name: "Huila" },
  { id: "REG-006", name: "Boyacá" },
  { id: "REG-007", name: "Santander" },
  { id: "REG-008", name: "Nariño" },
  { id: "REG-009", name: "Cesar" },
  { id: "REG-010", name: "Meta" }
]

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    nombre: "",
    documento: "",
    email: "",
    password: "",
    id_rol: "",
    id_region: "",
    numero_predial: "" // 🆕 Nuevo campo
  })

  // 💡 Mostrar campo predial solo si es Productor
  const isProductor = formData.id_rol === "PRODUCTOR"

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 1. Registro en Supabase Auth + Trigger Automático
      // Enviamos toda la metadata que la función 'handle_new_user' espera en la DB
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password.trim(),
        options: {
          data: {
            nombre: formData.nombre,
            documento: formData.documento,
            id_rol: formData.id_rol,
            id_region: formData.id_region,
            numero_predial: formData.id_rol === "PRODUCTOR" ? formData.numero_predial : null
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error("No se pudo crear el usuario")

      // 💡 El Trigger 'on_auth_user_created' se encarga de crear el usuario en la tabla 'public.usuario'
      // No necesitamos llamar a api.post("/auth/register")

      // 3. Éxito - Redirigir con mensaje
      router.push("/login?registered=true")

    } catch (err: any) {
      console.error("Error en registro:", err)
      setError(err.message || "Ocurrió un error inesperado")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="bg-slate-900/40 backdrop-blur-xl border-slate-800 shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />

          <CardHeader className="space-y-1 pb-8 pt-8 text-center">
            <div className="mx-auto bg-emerald-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/20">
              <UserPlus className="w-8 h-8 text-emerald-500" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight text-white">Únete al Sistema ICA</CardTitle>
            <CardDescription className="text-slate-400 text-lg">
              Crea tu cuenta para gestionar predios e inspecciones fitosanitarias
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleRegister} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm font-medium">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre Completo */}
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-slate-300">Nombre Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input
                      id="nombre"
                      placeholder="Ej: Juan Pérez"
                      className="pl-10 bg-slate-950/50 border-slate-800 text-white placeholder:text-slate-600 focus:ring-emerald-500/20 focus:border-emerald-500"
                      required
                      value={formData.nombre}
                      onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                    />
                  </div>
                </div>

                {/* Documento */}
                <div className="space-y-2">
                  <Label htmlFor="documento" className="text-slate-300">Número de Documento</Label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input
                      id="documento"
                      placeholder="CC o NIT"
                      className="pl-10 bg-slate-950/50 border-slate-800 text-white placeholder:text-slate-600 focus:ring-emerald-500/20 focus:border-emerald-500"
                      required
                      value={formData.documento}
                      onChange={e => setFormData({ ...formData, documento: e.target.value })}
                    />
                  </div>
                </div>

                {/* Correo */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300">Correo Electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      className="pl-10 bg-slate-950/50 border-slate-800 text-white placeholder:text-slate-600 focus:ring-emerald-500/20 focus:border-emerald-500"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                {/* Contraseña */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-300">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10 bg-slate-950/50 border-slate-800 text-white placeholder:text-slate-600 focus:ring-emerald-500/20 focus:border-emerald-500"
                      required
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                </div>

                {/* Rol */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Tipo de Usuario</Label>
                  <Select
                    onValueChange={(val) => setFormData({ ...formData, id_rol: val })}
                    required
                  >
                    <SelectTrigger className="bg-slate-950/50 border-slate-800 text-white focus:ring-emerald-500/20">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-slate-500" />
                        <SelectValue placeholder="Seleccione su rol" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                      {ROLES.map(rol => (
                        <SelectItem key={rol.id} value={rol.id}>{rol.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Región */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Región Fitosanitaria</Label>
                  <Select
                    onValueChange={(val) => setFormData({ ...formData, id_region: val })}
                    required
                  >
                    <SelectTrigger className="bg-slate-950/50 border-slate-800 text-white focus:ring-emerald-500/20">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        <SelectValue placeholder="Seleccione su región" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                      {REGIONES.map(reg => (
                        <SelectItem key={reg.id} value={reg.id}>{reg.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 🆕 Campo condicional para Productor */}
              <AnimatePresence>
                {isProductor && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2 text-emerald-400 font-medium">
                        <IdCard className="w-5 h-5" />
                        Información del Predio
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="numero_predial" className="text-slate-300">Número de Registro Predial (ICA)</Label>
                        <Input
                          id="numero_predial"
                          placeholder="Código de 10 dígitos"
                          className="bg-slate-950/50 border-slate-800 text-white placeholder:text-slate-600 focus:border-emerald-500"
                          required={isProductor}
                          value={formData.numero_predial}
                          onChange={e => setFormData({ ...formData, numero_predial: e.target.value })}
                        />
                        <p className="text-xs text-slate-500">Este número nos permite vincular tus cultivos automáticamente.</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-12 text-lg font-semibold transition-all shadow-lg shadow-emerald-500/10 group"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Crear mi cuenta de acceso
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="pb-8 pt-4 flex flex-col space-y-4">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-800"></span></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-950 px-2 text-slate-500">¿Ya tienes una cuenta?</span></div>
            </div>
            <Link
              href="/login"
              className="text-slate-400 hover:text-emerald-400 text-sm transition-colors flex items-center justify-center gap-2"
            >
              Volver al inicio de sesión
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}

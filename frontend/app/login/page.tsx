"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { motion, AnimatePresence } from "framer-motion"
import { Leaf, UserPlus, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function Login() {
  const { isLoading: authLoading } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  
  const searchParams = useSearchParams()
  const justRegistered = searchParams.get("registered") === "true"

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Llamamos a NUESTRO Gateway (Puerto 5000), no a Supabase directamente
      // Esto asegura que el token sea HS256 y compatible con los microservicios
      const res = await fetch("http://localhost:5000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Credenciales incorrectas.")
        setLoading(false)
        return
      }

      // Guardamos el token de ms-auth que entiende el Gateway
      localStorage.setItem("token", data.token)
      window.location.href = "/dashboard"
    } catch {
      setError("No se pudo conectar con el servidor. ¿Está el backend corriendo?")
      setLoading(false)
    }
  }

  if (authLoading) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="w-full max-w-[420px] z-10 px-4"
      >
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
            <Leaf className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Sistema ICA</h1>
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">Portal de Autenticación</p>
        </div>

        <Card className="shadow-2xl rounded-3xl border-border/50 bg-card/60 backdrop-blur-xl">
          <CardHeader className="space-y-1 pb-6 pt-8 px-8">
            <CardTitle className="text-2xl font-bold text-center text-white">¡Bienvenido!</CardTitle>
            <CardDescription className="text-center text-slate-400">
              Ingresa tus credenciales seguras para acceder
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-muted-foreground ml-1">Correo Electrónico</Label>
                <Input
                  type="email"
                  placeholder="ejemplo@productor.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary h-12 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground ml-1">Contraseña</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary h-12 text-white"
                />
              </div>

              <AnimatePresence>
                {justRegistered && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4">
                    <Alert className="rounded-xl bg-emerald-500/10 border-emerald-500/20 text-emerald-500">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <AlertDescription>¡Registro exitoso! Por favor, espera a que el Administrador ICA apruebe tu cuenta.</AlertDescription>
                    </Alert>
                  </motion.div>
                )}

                {error && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                    <Alert variant="destructive" className="rounded-xl bg-destructive/10 border-destructive/20 text-destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button 
                type="submit" 
                className="w-full rounded-xl h-12 text-base font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 active:scale-[0.98] bg-emerald-600 hover:bg-emerald-500 text-white border-0"
                disabled={loading}
              >
                {loading ? "Iniciando sesión..." : "Acceder al Sistema"}
              </Button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">O si no tienes cuenta</span>
                </div>
              </div>

              <Link href="/register" className="block w-full">
                <Button 
                  type="button" 
                  variant="outline"
                  className="w-full rounded-xl h-12 text-base font-medium border-border/50 hover:bg-muted/50 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-slate-300"
                >
                  <UserPlus className="w-4 h-4" />
                  Regístrate ahora
                </Button>
              </Link>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

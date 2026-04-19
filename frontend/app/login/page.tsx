"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { motion } from "framer-motion"
import { Leaf } from "lucide-react"

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
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    // AHORA ENTRAMOS DIRECTO A SUPABASE
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError("Credenciales incorrectas o cuenta no existe en Supabase.")
      setLoading(false)
      return
    }

    // Si Supabase lo aprueba, guardamos local y forzamos recarga al dashboard
    if (data.session) {
      localStorage.setItem("token", data.session.access_token)
      window.location.href = "/dashboard"
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
          <h1 className="text-3xl font-bold tracking-tight">Sistema ICA</h1>
          <p className="text-muted-foreground text-sm font-medium">Autenticación Oficial (Supabase)</p>
        </div>

        <Card className="shadow-2xl rounded-3xl border-border/50 bg-card/60 backdrop-blur-xl">
          <CardHeader className="space-y-1 pb-6 pt-8 px-8">
            <CardTitle className="text-2xl font-bold text-center">¡Bienvenido de nuevo!</CardTitle>
            <CardDescription className="text-center">
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
                  className="rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary h-12"
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
                  className="rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary h-12"
                />
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                  <Alert variant="destructive" className="rounded-xl bg-destructive/10 border-destructive/20 text-destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}

              <Button 
                type="submit" 
                className="w-full rounded-xl h-12 text-base font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? "Verificando con Supabase..." : "Iniciar Sesión"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

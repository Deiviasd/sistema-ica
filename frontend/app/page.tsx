"use client"

import { motion, AnimatePresence } from "framer-motion"
import { 
  Leaf, 
  ShieldCheck, 
  BarChart3, 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  Globe, 
  Zap,
  Menu,
  X,
  Instagram
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import Image from "next/image"

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [selectedBio, setSelectedBio] = useState<null | 'sergio' | 'jhon' | 'cristian'>(null)

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* 🧭 NAVIGATION */}
      <nav className="fixed top-0 w-full z-50 bg-background/60 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                <Leaf className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xl font-black tracking-tighter uppercase italic">ICA Hub</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Funcionalidades</a>
              <a href="#compliance" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Normatividad</a>
              <a href="#about" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Nosotros</a>
              <div className="h-6 w-px bg-border/50 mx-2" />
              <ThemeToggle />
              <Link href="/login">
                <Button variant="ghost" className="font-bold">Iniciar Sesión</Button>
              </Link>
              <Link href="/register">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-xl px-6">
                  Comenzar Ahora
                </Button>
              </Link>
            </div>

            {/* Mobile Toggle */}
            <div className="md:hidden flex items-center gap-4">
              <ThemeToggle />
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-foreground"
              >
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-background border-b border-border/50 px-4 py-8 space-y-6 overflow-hidden"
            >
              <a href="#features" className="block text-lg font-bold" onClick={() => setIsMenuOpen(false)}>Funcionalidades</a>
              <a href="#compliance" className="block text-lg font-bold" onClick={() => setIsMenuOpen(false)}>Normatividad</a>
              <div className="flex flex-col gap-4 pt-4">
                <Link href="/login" className="w-full">
                  <Button variant="outline" className="w-full h-12 font-bold rounded-xl text-lg">Inicia Sesión</Button>
                </Link>
                <Link href="/register" className="w-full">
                  <Button className="w-full h-12 bg-primary text-primary-foreground font-black rounded-xl text-lg">Regístrate</Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* 🚀 HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-primary/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-blue-500/10 blur-[100px] rounded-full translate-y-1/4 -translate-x-1/4 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest mb-6">
                <Zap className="w-3 h-3" />
                Tecnología para el Agro Colombiano
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.1] mb-8">
                Digitaliza tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-blue-500">Producción Exportadora</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed max-w-xl">
                La plataforma inteligente para la gestión de predios, siembras e inspecciones fitosanitarias. Cumple con la normatividad ICA de manera ágil y profesional.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <Button className="h-16 px-10 text-xl font-black bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all w-full sm:w-auto">
                    Empezar Gratis
                    <ArrowRight className="ml-2 w-6 h-6" />
                  </Button>
                </Link>
                <div className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-card/40 backdrop-blur-sm border border-border/50">
                  <div className="flex -space-x-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold">
                        U{i}
                      </div>
                    ))}
                  </div>
                  <div className="text-sm">
                    <p className="font-bold leading-none">+500 Productores</p>
                    <p className="text-muted-foreground text-xs leading-none mt-1">Confían en ICA Hub</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative"
            >
              <div className="relative aspect-square md:aspect-video rounded-[2.5rem] overflow-hidden border-8 border-card shadow-2xl">
                 <Image 
                    src="/hero_agriculture_tech.png" 
                    alt="ICA Hub Agriculture" 
                    fill 
                    className="object-cover"
                    priority
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              </div>
              
              {/* Floating elements */}
              <div className="absolute -top-6 -right-6 bg-card/80 backdrop-blur-lg border border-border p-4 rounded-2xl shadow-xl animate-bounce-slow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold">Inspección</p>
                    <p className="text-sm font-black">APROBADA</p>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-10 -left-10 bg-card/80 backdrop-blur-lg border border-border p-6 rounded-3xl shadow-xl animate-float">
                <p className="text-xs text-muted-foreground font-bold mb-2">Tasa de Cumplimiento</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black">98.4%</span>
                  <div className="w-24 h-8 bg-primary/10 rounded-lg overflow-hidden flex items-end px-1 gap-1">
                    {[40, 60, 35, 90, 70, 95].map((h, i) => (
                      <div key={i} className="flex-1 bg-primary/50 rounded-t-sm" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 📦 FEATURES SECTION */}
      <section id="features" className="py-24 bg-muted/30 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-sm font-black text-primary uppercase tracking-widest mb-4">Todo lo que necesitas</h2>
            <h3 className="text-4xl md:text-5xl font-black tracking-tighter mb-6">Optimiza cada fase de tu cadena productiva</h3>
            <p className="text-muted-foreground text-lg italic">Tecnología diseñada específicamente para los procesos del ICA.</p>
          </div>

          <motion.div 
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {[
              { 
                icon: ShieldCheck, 
                title: "Control Fitosanitario", 
                desc: "Gestión rigurosa de plagas y enfermedades con registros automáticos.",
                color: "text-emerald-500",
                bg: "bg-emerald-500/10"
              },
              { 
                icon: BarChart3, 
                title: "Reportes en Tiempo Real", 
                desc: "Visibilidad total sobre tus hectáreas cultivadas y proyecciones de cosecha.",
                color: "text-blue-500",
                bg: "bg-blue-500/10"
              },
              { 
                icon: MapPin, 
                title: "Georreferenciación", 
                desc: "Ubica con precisión tus predios y lotes para una logística eficiente.",
                color: "text-amber-500",
                bg: "bg-amber-500/10"
              }
            ].map((feature, i) => (
              <motion.div 
                key={i} 
                variants={item}
                className="group p-8 rounded-[2rem] bg-card border border-border/50 hover:border-primary/30 transition-all hover:shadow-2xl hover:shadow-primary/5 cursor-default"
              >
                <div className={`w-14 h-14 ${feature.bg} ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold mb-4">{feature.title}</h4>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 🇨🇴 COMPLIANCE SECTION */}
      <section id="compliance" className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="bg-primary/5 rounded-[3rem] p-8 md:p-16 border border-primary/20 flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1">
              <h2 className="text-4xl font-black tracking-tighter mb-6 leading-tight">
                Cumplimiento con la <br/> Normatividad <span className="text-primary italic">ICA 2024</span>
              </h2>
              <ul className="space-y-4 mb-10">
                {[
                  "Registro automático de unidades de producción.",
                  "Formatos de monitoreo estandarizados.",
                  "Certificaciones de exportación digitales.",
                  "Historial de auditorías trazable."
                ].map((text, i) => (
                  <li key={i} className="flex items-center gap-3 font-bold text-muted-foreground">
                    <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                    {text}
                  </li>
                ))}
              </ul>
              <Button className="h-14 px-8 bg-foreground text-background font-black rounded-xl hover:scale-105 transition-all">
                Ver Documentación del Sistema
              </Button>
            </div>
            <div className="flex-1 w-full max-w-md">
              <div className="relative bg-card border-4 border-primary/30 rounded-[2rem] p-8 shadow-2xl rotate-3">
                 <div className="flex items-center justify-between mb-8">
                   <div className="w-12 h-4 bg-muted rounded-full" />
                   <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                     <Globe className="w-6 h-6" />
                   </div>
                 </div>
                 <div className="space-y-4">
                   <div className="h-4 w-3/4 bg-muted rounded-full animate-pulse" />
                   <div className="h-4 w-1/2 bg-muted rounded-full animate-pulse" />
                   <div className="h-32 w-full bg-primary/10 rounded-2xl mt-6 flex items-center justify-center">
                      <ShieldCheck className="w-16 h-16 text-primary/40" />
                   </div>
                 </div>
                 <div className="mt-8 flex justify-end">
                    <div className="px-4 py-2 bg-primary text-primary-foreground font-black text-xs rounded-lg">VERIFICADO ICA</div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 👥 ABOUT / TEAM SECTION */}
      <section id="about" className="py-24 bg-muted/20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-sm font-black text-primary uppercase tracking-widest mb-4">Nuestro Equipo</h2>
            <h3 className="text-4xl md:text-5xl font-black tracking-tighter mb-6">Mentes Detrás de ICA Hub</h3>
            <p className="text-muted-foreground text-lg">Un equipo apasionado por la innovación tecnológica en el sector agrícola.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
            {/* SERGIO */}
            <motion.div 
              variants={item}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="group text-center"
            >
              <div 
                onClick={() => setSelectedBio('sergio')}
                className="relative w-64 h-80 mx-auto mb-8 rounded-[2rem] overflow-hidden border-4 border-card shadow-2xl transition-all duration-500 group-hover:scale-105 group-hover:-rotate-2 cursor-pointer"
              >
                <Image src="/team/sergio.jpg" alt="Sergio Robles" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-end p-6 grayscale-0">
                  <span className="text-white font-black text-xs tracking-widest mb-2">VER BIOGRAFÍA</span>
                  <div className="h-1 w-12 bg-white rounded-full" />
                </div>
              </div>
              <h4 className="text-2xl font-black mb-2">Sergio Robles Torres</h4>
              <p className="text-muted-foreground font-bold">Especialista en Interfaz</p>
            </motion.div>

            {/* CRISTIAN */}
            <motion.div 
              variants={item}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="group text-center"
            >
              <div 
                onClick={() => setSelectedBio('cristian')}
                className="relative w-64 h-80 mx-auto mb-8 rounded-[2rem] overflow-hidden border-4 border-card shadow-2xl transition-all duration-700 hover:grayscale group cursor-pointer"
              >
                <Image src="/team/cristian.png" alt="Cristian Gomez" fill className="object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-[0.2]" />
                
                {/* Memorial Hover Effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 flex flex-col items-center justify-center p-6">
                  {/* Cruz SVG */}
                  <div className="w-16 h-24 relative mb-4">
                    <div className="absolute left-1/2 -translate-x-1/2 top-0 w-2 h-full bg-white/30 rounded-full" />
                    <div className="absolute top-1/3 left-0 w-full h-2 bg-white/30 rounded-full" />
                  </div>
                  <p className="text-white/40 text-[10px] font-black tracking-widest uppercase mb-4">En nuestros corazones</p>
                  
                  <div className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white text-[10px] font-black tracking-widest hover:bg-white/20 transition-colors">
                    VER BIOGRAFÍA
                  </div>
                </div>
              </div>
              <h4 className="text-2xl font-black mb-2">Cristian Gomez Peña</h4>
              <p className="text-muted-foreground font-bold">Arquitectura de Sistemas</p>
            </motion.div>

            {/* JHON */}
            <motion.div 
              variants={item}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="group text-center"
            >
              <div 
                onClick={() => setSelectedBio('jhon')}
                className="relative w-64 h-80 mx-auto mb-8 rounded-[2rem] overflow-hidden border-4 border-card shadow-2xl transition-all duration-500 group-hover:scale-105 group-hover:rotate-2 cursor-pointer"
              >
                <Image src="/team/jhon.png" alt="Jhon Ardila" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-600/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-end p-6 grayscale-0">
                  <span className="text-white font-black text-xs tracking-widest mb-2">VER BIOGRAFÍA</span>
                  <div className="h-1 w-12 bg-white rounded-full" />
                </div>
              </div>
              <h4 className="text-2xl font-black mb-2">Jhon Deivi Ardila</h4>
              <p className="text-muted-foreground font-bold">Arquitecto de Soluciones</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 🎭 BIOGRAPHY MODALS */}
      <AnimatePresence>
        {selectedBio === 'sergio' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-background/90 backdrop-blur-2xl"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative w-full max-w-5xl max-h-[90vh] bg-card border border-border/50 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row"
            >
              <button 
                onClick={() => setSelectedBio(null)}
                className="absolute top-6 right-6 z-50 p-3 bg-background/50 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Lado Izquierdo: Scroll de Historia */}
              <div className="flex-1 overflow-y-auto p-8 md:p-16 custom-scrollbar space-y-20 scroll-smooth">
                <div className="space-y-6">
                   <h2 className="text-4xl md:text-6xl font-black tracking-tighter">Sergio Robles</h2>
                   <p className="text-xl md:text-2xl text-primary font-bold italic leading-tight">Inspirando el futuro digital de Colombia</p>
                </div>

                {/* Capítulo 1 */}
                <div className="space-y-8">
                  <div className="relative aspect-video rounded-3xl overflow-hidden border-2 border-primary/20 shadow-xl">
                    <Image src="/team/bio/sergio_agriculture.jpg" alt="Agriculture Journey" fill className="object-cover" />
                  </div>
                  <div className="space-y-4">
                    <div className="inline-flex px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-widest">Capítulo 1: El Despertar Tecnológico</div>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      Estudiante de Ingeniería de Sistemas y desarrollador enfocado en crear soluciones tecnológicas modernas. Actualmente trabaja en el desarrollo de la app <span className="text-foreground font-bold">ICA</span>, un proyecto orientado a innovación digital y transformación tecnológica en Colombia.
                    </p>
                  </div>
                </div>

                {/* Capítulo 2 */}
                <div className="space-y-8">
                  <div className="relative aspect-video rounded-3xl overflow-hidden border-2 border-emerald-500/20 shadow-xl">
                    <Image src="/team/bio/sergio_minecraft.jpg" alt="Minecraft Journey" fill className="object-cover" />
                  </div>
                  <div className="space-y-4">
                    <div className="inline-flex px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded-full uppercase tracking-widest">Capítulo 2: Mundos Virtuales y Comunidades</div>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      Apasionado por la programación, los videojuegos y la optimización de sistemas, también ha participado en comunidades relacionadas con <span className="text-foreground font-bold">Minecraft</span> y proyectos inspirados en Mojang.
                    </p>
                  </div>
                </div>

                {/* Visión */}
                <div className="pb-20">
                   <div className="p-8 rounded-[2rem] bg-primary/5 border border-primary/10 relative">
                     <div className="absolute -top-4 -left-4 w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground">
                        <Globe className="w-6 h-6" />
                     </div>
                     <p className="text-2xl font-bold tracking-tight italic leading-snug">
                        "Su visión es construir tecnología que conecte innovación, comunidades y nuevas oportunidades digitales para Latinoamérica."
                     </p>
                   </div>
                </div>
              </div>

              {/* Lado Derecho: Imagen Destacada (Desktop) */}
              <div className="hidden lg:block w-1/3 relative bg-muted/30">
                <Image src="/team/bio/sergio_main.jpg" alt="Sergio Robles Portrait" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-card via-transparent to-transparent" />
              </div>
            </motion.div>
          </motion.div>
        )}

        {selectedBio === 'jhon' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-background/90 backdrop-blur-2xl"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative w-full max-w-5xl max-h-[90vh] bg-card border border-border/50 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row"
            >
              <button 
                onClick={() => setSelectedBio(null)}
                className="absolute top-6 right-6 z-50 p-3 bg-background/50 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Lado Izquierdo: Scroll de Historia */}
              <div className="flex-1 overflow-y-auto p-8 md:p-16 custom-scrollbar space-y-20 scroll-smooth">
                <div className="space-y-6">
                   <h2 className="text-4xl md:text-6xl font-black tracking-tighter">Jhon Deivi Ardila</h2>
                   <p className="text-xl md:text-2xl text-emerald-500 font-bold italic leading-tight">Liderazgo y Estrategia Tecnológica</p>
                </div>

                {/* Capítulo 1 */}
                <div className="space-y-8">
                  <div className="relative aspect-video rounded-3xl overflow-hidden border-2 border-emerald-500/20 shadow-xl">
                    <Image src="/team/bio/jhon_microsoft.jpg" alt="Microsoft Journey" fill className="object-cover" />
                  </div>
                  <div className="space-y-4">
                    <div className="inline-flex px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded-full uppercase tracking-widest">Capítulo 1: Liderazgo y Capacidad Analítica</div>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      Estudiante de Ingeniería de Sistemas y compañero universitario de Sergio Robles. Desde sus primeros proyectos destacó por su <span className="text-foreground font-bold">liderazgo</span>, capacidad analítica y enfoque empresarial dentro del mundo tecnológico.
                    </p>
                  </div>
                </div>

                {/* Capítulo 2 */}
                <div className="space-y-8">
                  <div className="relative aspect-video rounded-3xl overflow-hidden border-2 border-primary/20 shadow-xl">
                    <Image src="/team/bio/jhon_agriculture.jpg" alt="Agriculture Journey" fill className="object-cover" />
                  </div>
                  <div className="space-y-4">
                    <div className="inline-flex px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-widest">Capítulo 2: Innovación Corporativa</div>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      Mientras continuaba su formación académica, comenzó a trabajar en proyectos vinculados a <span className="text-foreground font-bold">Microsoft</span>, participando en entornos corporativos y de innovación digital aplicada.
                    </p>
                  </div>
                </div>

                {/* Visión */}
                <div className="pb-20">
                   <div className="p-8 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 relative">
                     <div className="absolute -top-4 -left-4 w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-primary-foreground text-white">
                        <ShieldCheck className="w-6 h-6" />
                     </div>
                     <p className="text-2xl font-bold tracking-tight italic leading-snug">
                        "Jhon busca crear soluciones modernas con impacto real en empresas y comunidades, transformando sectores productivos a través del software."
                     </p>
                   </div>
                </div>
              </div>

              {/* Lado Derecho: Imagen Destacada (Desktop) */}
              <div className="hidden lg:block w-1/3 relative bg-muted/30">
                <Image src="/team/bio/jhon_main.jpg" alt="Jhon Ardila Portrait" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-card via-transparent to-transparent" />
              </div>
            </motion.div>
          </motion.div>
        )}

        {selectedBio === 'cristian' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-background/90 backdrop-blur-2xl"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative w-full max-w-5xl max-h-[90vh] bg-card border border-border/50 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row"
            >
              <button 
                onClick={() => setSelectedBio(null)}
                className="absolute top-6 right-6 z-50 p-3 bg-background/50 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Lado Izquierdo: Scroll de Historia */}
              <div className="flex-1 overflow-y-auto p-8 md:p-16 custom-scrollbar space-y-20 scroll-smooth">
                <div className="space-y-6">
                   <h2 className="text-4xl md:text-6xl font-black tracking-tighter italic">Cristian Gomez</h2>
                   <p className="text-xl md:text-2xl text-muted-foreground font-bold italic leading-tight">Eterno Arquitecto de Innovación</p>
                </div>

                {/* Capítulo 1 */}
                <div className="space-y-8">
                  <div className="relative aspect-video rounded-3xl overflow-hidden border-2 border-border/50 shadow-xl grayscale-0 group hover:grayscale transition-all duration-700">
                    <Image src="/team/bio/cristian_amazon.jpg" alt="Amazon Journey" fill className="object-cover" />
                  </div>
                  <div className="space-y-4">
                    <div className="inline-flex px-3 py-1 bg-muted text-muted-foreground text-[10px] font-black rounded-full uppercase tracking-widest">Capítulo 1: Visión Técnica y Escalabilidad</div>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                       Estudiante de Ingeniería de Sistemas y miembro destacado del grupo universitario junto a Sergio Robles y Jhon Ardila. Reconocido por su <span className="text-foreground font-bold">visión técnica</span> y capacidad para diseñar sistemas escalables, Cristian se especializó en arquitectura de software y desarrollo backend.
                    </p>
                  </div>
                </div>

                {/* Capítulo 2 */}
                <div className="space-y-8">
                  <div className="p-12 rounded-[2rem] bg-foreground/5 border border-foreground/10">
                     <p className="text-lg text-muted-foreground leading-relaxed">
                        Durante su trayectoria profesional participó en proyectos relacionados con <span className="text-foreground font-bold">Amazon</span>, desempeñándose como arquitecto de software en entornos de alta demanda y soluciones cloud.
                     </p>
                  </div>
                </div>

                {/* Visión */}
                <div className="pb-20">
                   <div className="p-8 rounded-[2rem] bg-primary/5 border border-primary/10 relative">
                     <div className="absolute -top-4 -left-4 w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
                        <BarChart3 className="w-6 h-6" />
                     </div>
                     <p className="text-2xl font-bold tracking-tight italic leading-snug">
                        "Su enfoque combina innovación, rendimiento y diseño de infraestructuras modernas, con el objetivo de construir plataformas tecnológicas eficientes y preparadas para millones de usuarios."
                     </p>
                   </div>
                </div>
              </div>

              {/* Lado Derecho: Imagen Destacada (Desktop) */}
              <div className="hidden lg:block w-1/3 relative bg-muted/30 grayscale hover:grayscale-0 transition-all duration-1000">
                <Image src="/team/bio/cristian_main.jpg" alt="Cristian Gomez Portrait" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-card via-transparent to-transparent" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🏁 CTA FINAL */}
      <section className="py-24 relative">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-8 italic">¿Listo para modernizar tu agro?</h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Únete a cientos de exportadores que ya están transformando la agricultura en Colombia.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/register">
              <Button className="h-16 px-12 text-xl font-black bg-primary text-primary-foreground rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                Crear Cuenta Gratis
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="h-16 px-12 text-xl font-black border-2 border-border/50 rounded-2xl transition-all">
                Acceso al Portal
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 📜 FOOTER */}
      <footer className="py-20 border-t border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <Leaf className="w-6 h-6 text-primary" />
                <span className="text-xl font-black tracking-tighter uppercase italic">ICA Hub</span>
              </div>
              <p className="text-muted-foreground leading-relaxed max-w-sm font-medium">
                Plataforma integral para el sector agrícola colombiano. Impulsando la competitividad global a través de la digitalización y el cumplimiento normativo.
              </p>
            </div>
            <div>
              <h5 className="font-black uppercase tracking-widest text-xs mb-6">Plataforma</h5>
              <ul className="space-y-4 text-sm font-bold text-muted-foreground">
                <li><Link href="/login" className="hover:text-primary transition-colors">Dashboards</Link></li>
                <li><button onClick={() => alert("Documentación de API próximamente disponible para socios estratégicos.")} className="hover:text-primary transition-colors text-left">API para Integraciones</button></li>
                <li><button onClick={() => alert("Tus datos están protegidos con encriptación AES-256 de grado militar.")} className="hover:text-primary transition-colors text-left">Seguridad de Datos</button></li>
                <li><button onClick={() => alert("Planes diseñados para cada tamaño de productor. Contacta a ventas para una cotización.")} className="hover:text-primary transition-colors text-left">Planes</button></li>
              </ul>
            </div>
            <div>
              <h5 className="font-black uppercase tracking-widest text-xs mb-6">Compañía</h5>
              <ul className="space-y-4 text-sm font-bold text-muted-foreground">
                <li><a href="#about" className="hover:text-primary transition-colors">Nosotros</a></li>
                <li className="space-y-2">
                  <span className="block text-primary uppercase text-[10px] tracking-tighter">Síguenos en Instagram</span>
                  <div className="flex flex-col gap-2">
                    <a href="https://www.instagram.com/_sergio_robles_/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
                      <Instagram className="w-3 h-3" /> Sergio Robles
                    </a>
                    <a href="https://www.instagram.com/christian_xd29/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
                      <Instagram className="w-3 h-3" /> Cristian Gomez
                    </a>
                    <a href="https://www.instagram.com/deyvyyy/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
                      <Instagram className="w-3 h-3" /> Jhon Deivi
                    </a>
                  </div>
                </li>
                <li><button onClick={() => alert("Términos de servicio actualizados a Mayo 2024.")} className="hover:text-primary transition-colors text-left">Términos y Condiciones</button></li>
                <li><a href="https://www.ica.gov.co" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Políticas ICA</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-12 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-muted-foreground font-medium">
              © 2024 ICA Hub. Todos los derechos reservados. Tecnología para un campo productivo.
            </p>
            <div className="flex gap-6">
               <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors">
                 <Globe className="w-4 h-4" />
               </span>
               <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors">
                 <ShieldCheck className="w-4 h-4" />
               </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

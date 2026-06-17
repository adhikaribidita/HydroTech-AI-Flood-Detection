import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'
import EarthScene from '../components/EarthScene'
import { useStore } from '../store/useStore'
import { 
  Globe, 
  Cpu, 
  Zap, 
  ShieldAlert, 
  Play, 
  ChevronRight, 
  X,
  Activity,
  Layers,
  Volume2,
  Tv,
  Leaf
} from 'lucide-react'

// Generic count-up animation component
function Counter({ value }: { value: string }) {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    const matches = value.match(/[\d.]+/)
    if (!matches) return
    const target = parseFloat(matches[0])
    let startTime: number | null = null
    const duration = 1600 // ms
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCount(progress * target)
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }, [value])
  
  const matches = value.match(/[\d.]+/)
  if (!matches) return <span>{value}</span>
  const suffix = value.replace(matches[0], '')
  const hasDecimal = matches[0].includes('.')
  
  return (
    <span>
      {hasDecimal ? count.toFixed(1) : Math.floor(count)}
      {suffix}
    </span>
  )
}

// High-tech telemetry logs streamer
function TelemetryConsole() {
  const [logs, setLogs] = useState<string[]>([
    '[SYS_BOOT] HydroTech Telemetry System initialized.',
    '[SAT_SYNC] Sync channel active: sentinel-2b orbital array.',
    '[MODEL_LOAD] efficientnet-b3 backbone skip paths bound.',
  ])
  const containerRef = useRef<HTMLDivElement>(null)

  const mockLogPhrases = [
    '[SAT_SYNC] Sentinel-2B optical band sync active.',
    '[INF_RUN] Running convolutional U-Net++ segmentation passes...',
    '[SYS_LOG] Normalized water probability threshold: 0.50.',
    '[ALRT] High probability inundation detected in Sector E-4.',
    '[SAT_SYNC] Recalibrating telemetry anchors: 34.0522° N, 118.2437° W.',
    '[INF_RUN] Segmentation output dimension shape: [1, 3, 256, 256].',
    '[SYS_LOG] API response latency: 14ms (healthy status).',
    '[ALRT] Threat advisory triggered for localized basins.',
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      const newLog = mockLogPhrases[Math.floor(Math.random() * mockLogPhrases.length)]
      const timestamp = new Date().toISOString().split('T')[1].slice(0, 8)
      setLogs((prev) => [...prev.slice(-4), `[${timestamp}] ${newLog}`])
    }, 2800)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className="glass-panel p-4 w-full h-[120px] font-mono text-[9px] text-slate-400 bg-[#001423]/70 border-cyan-500/10 flex flex-col justify-between select-none">
      <div className="flex justify-between items-center border-b border-cyan-500/10 pb-1.5 mb-1.5 text-cyan-400 font-bold uppercase tracking-[2px]">
        <span>SYSTEM DIAGNOSTIC FEED</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      </div>
      <div ref={containerRef} className="flex-1 overflow-y-auto space-y-1.5 no-scrollbar scroll-smooth">
        {logs.map((log, index) => (
          <div key={index} className={`leading-relaxed ${log.includes('ALRT') ? 'text-rose-400 font-bold' : log.includes('SAT') ? 'text-cyan-300' : ''}`}>
            {log}
          </div>
        ))}
      </div>
    </div>
  )
}

// 3D Glassmorphic Floating Tilt Card with Conic border glow & 3D Parallax support
function FloatingCard({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Gentle floating motion via GSAP
    if (cardRef.current) {
      gsap.to(cardRef.current, {
        y: -8,
        duration: 3.0,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut',
        delay: delay
      })
    }
  }, [delay])

  // Mouse tilt handlers with 3D Parallax support
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    
    // Tilt values (max 12 degrees)
    const tiltX = (y / (rect.height / 2)) * -12
    const tiltY = (x / (rect.width / 2)) * 12
    
    gsap.to(cardRef.current, {
      rotateX: tiltX,
      rotateY: tiltY,
      transformPerspective: 1000,
      duration: 0.35,
      ease: 'power2.out'
    })
  }

  const handleMouseLeave = () => {
    if (!cardRef.current) return
    gsap.to(cardRef.current, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.6,
      ease: 'power3.out'
    })
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`glowing-conic-card transition-all duration-300 cursor-pointer select-none ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div className="glowing-conic-card-inner p-5 flex items-start gap-4" style={{ transformStyle: 'preserve-3d' }}>
        {children}
      </div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const setEarthClicked = useStore((s) => s.setEarthClicked)
  const earthHovered = useStore((s) => s.earthHovered)
  const earthClicked = useStore((s) => s.earthClicked)

  const titleRef = useRef<HTMLHeadingElement | null>(null)
  const subtitleRef = useRef<HTMLDivElement | null>(null)
  const descriptionRef = useRef<HTMLParagraphElement | null>(null)
  const buttonsRef = useRef<HTMLDivElement | null>(null)
  const rightPanelRef = useRef<HTMLDivElement | null>(null)
  const footerRef = useRef<HTMLDivElement | null>(null)
  const pageContainerRef = useRef<HTMLDivElement | null>(null)
  const flashOverlayRef = useRef<HTMLDivElement | null>(null)

  const [showDemo, setShowDemo] = useState(false)
  const [demoActiveStep, setDemoActiveStep] = useState(0)

  // Custom coordinate-tracking HUD cursor states
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 })
  const [gisCoords, setGisCoords] = useState({ lat: '34.0522° N', lon: '-118.2437° W' })
  const [isCursorActive, setIsCursorActive] = useState(false)
  const [cursorLabel, setCursorLabel] = useState('SYSTEM READY')

  // Listen to window mouse coordinates and target elements
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
      
      const widthRatio = e.clientX / window.innerWidth
      const heightRatio = e.clientY / window.innerHeight
      const latVal = (34.0522 + (0.5 - heightRatio) * 1.8).toFixed(4)
      const lonVal = (-118.2437 + (widthRatio - 0.5) * 2.4).toFixed(4)
      setGisCoords({
        lat: `${Math.abs(parseFloat(latVal))}° ${parseFloat(latVal) >= 0 ? 'N' : 'S'}`,
        lon: `${Math.abs(parseFloat(lonVal))}° ${parseFloat(lonVal) >= 0 ? 'E' : 'W'}`
      })

      const target = e.target as HTMLElement | null
      if (target) {
        const isHoverable = 
          target.closest('button') || 
          target.closest('a') || 
          target.closest('.feature-card') || 
          target.tagName === 'CANVAS' ||
          target.closest('.interactive-target')
        
        setIsCursorActive(!!isHoverable)
        if (target.closest('.feature-card')) {
          setCursorLabel('LOCK-ON // DATA')
        } else if (target.tagName === 'CANVAS') {
          setCursorLabel('SURFACE SCAN')
        } else if (target.closest('button')) {
          setCursorLabel('INITIATING...')
        } else {
          setCursorLabel('SYSTEM READY')
        }
      }
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // GSAP animations on mount
  useEffect(() => {
    if (titleRef.current) {
      const chars = titleRef.current.querySelectorAll('.char')
      gsap.fromTo(
        chars,
        { 
          opacity: 0, 
          y: 80, 
          rotateX: -110, 
          rotateY: 20, 
          scale: 0.8,
          filter: 'blur(10px)' 
        },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          rotateY: 0,
          scale: 1,
          filter: 'blur(0px)',
          duration: 1.2,
          stagger: 0.04,
          ease: 'power4.out',
        }
      )
    }

    if (subtitleRef.current) {
      gsap.fromTo(
        subtitleRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, delay: 0.6, ease: 'power3.out' }
      )
    }

    if (descriptionRef.current) {
      gsap.fromTo(
        descriptionRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, delay: 0.8, ease: 'power3.out' }
      )
    }

    if (buttonsRef.current) {
      gsap.fromTo(
        buttonsRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, delay: 1.0, ease: 'power3.out' }
      )
    }

    if (rightPanelRef.current) {
      const cards = rightPanelRef.current.querySelectorAll('.feature-card')
      gsap.fromTo(
        cards,
        { opacity: 0, x: 50 },
        { opacity: 1, x: 0, duration: 0.8, stagger: 0.15, delay: 0.5, ease: 'power3.out' }
      )
    }

    if (footerRef.current) {
      const stats = footerRef.current.querySelectorAll('.stat-block')
      gsap.fromTo(
        stats,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, delay: 1.2, ease: 'power3.out' }
      )
    }
  }, [])

  // Speech synthesis and zoom exit sequence
  const handleEnter = () => {
    if (earthClicked) return
    setEarthClicked(true)

    // Trigger white flash burst transition overlay
    if (flashOverlayRef.current) {
      gsap.fromTo(
        flashOverlayRef.current,
        { opacity: 0 },
        { opacity: 0.95, duration: 0.4, yoyo: true, repeat: 1, ease: 'power2.inOut' }
      )
    }

    // Shrink, blur, and slide out HTML elements
    const tl = gsap.timeline()
    tl.to(titleRef.current, { opacity: 0, x: -60, filter: 'blur(8px)', duration: 0.7, ease: 'power3.in' })
    tl.to(subtitleRef.current, { opacity: 0, x: -40, filter: 'blur(8px)', duration: 0.7, ease: 'power3.in' }, '=-0.5')
    tl.to(descriptionRef.current, { opacity: 0, x: -40, filter: 'blur(8px)', duration: 0.7, ease: 'power3.in' }, '=-0.5')
    tl.to(buttonsRef.current, { opacity: 0, x: -40, filter: 'blur(8px)', duration: 0.7, ease: 'power3.in' }, '=-0.5')
    
    if (rightPanelRef.current) {
      tl.to(rightPanelRef.current.querySelectorAll('.feature-card'), { opacity: 0, x: 60, filter: 'blur(8px)', duration: 0.7, stagger: 0.08, ease: 'power3.in' }, '=-0.7')
    }
    if (footerRef.current) {
      tl.to(footerRef.current.querySelectorAll('.stat-block'), { opacity: 0, y: 40, filter: 'blur(8px)', duration: 0.7, stagger: 0.05, ease: 'power3.in' }, '=-0.7')
    }

    // AI voice synthesis greeting
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance('Welcome to HydroTech. Artificial Intelligence Flood Detection System Active.')
      utterance.lang = 'en-US'
      utterance.rate = 0.90
      utterance.pitch = 1.02

      const voices = window.speechSynthesis.getVoices()
      const femaleVoice = voices.find((v) => /female|woman|google|samantha|zira/i.test(v.name)) || voices[0]
      if (femaleVoice) {
        utterance.voice = femaleVoice
      }

      utterance.onend = () => {
        gsap.to(pageContainerRef.current, {
          opacity: 0,
          scale: 1.12,
          duration: 0.8,
          ease: 'power3.in',
          onComplete: () => {
            setEarthClicked(false)
            navigate('/dashboard')
          },
        })
      }

      utterance.onerror = () => {
        setTimeout(() => {
          setEarthClicked(false)
          navigate('/dashboard')
        }, 1600)
      }

      window.speechSynthesis.speak(utterance)
    } else {
      setTimeout(() => {
        setEarthClicked(false)
        navigate('/dashboard')
      }, 2000)
    }
  }

  // Demo step updates
  useEffect(() => {
    if (showDemo) {
      const interval = setInterval(() => {
        setDemoActiveStep((prev) => (prev + 1) % 4)
      }, 3500)
      return () => clearInterval(interval)
    }
    return undefined
  }, [showDemo])

  const titleText = 'HYDROTECH'

  return (
    <div
      ref={pageContainerRef}
      className="no-cursor w-screen h-screen overflow-hidden relative select-none no-scrollbar bg-[#031321]"
    >
      {/* 3D WebGL Canvas Layer (Earth, Ocean, Stars, Lights) */}
      <div className="absolute inset-0 z-0">
        <EarthScene onClick={handleEnter} />
      </div>

      {/* Cyber Grid Overlay */}
      <div className="absolute inset-0 cyber-grid opacity-15 pointer-events-none z-1" />

      {/* White Flash burst overlay for transitions */}
      <div
        ref={flashOverlayRef}
        className="absolute inset-0 bg-cyan-200 mix-blend-overlay opacity-0 pointer-events-none z-50"
      />

      {/* Cinematic dark atmospheric fog gradient wrappers */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#031321] via-transparent to-[#031321] opacity-75 pointer-events-none z-1" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#031321]/80 via-transparent to-[#031321]/50 pointer-events-none z-1" />

      {/* HUD Telemetry Frame */}
      <div className="absolute top-6 left-12 right-12 flex justify-between items-center text-slate-500 font-mono text-[9px] tracking-[4px] z-20 pointer-events-none">
        <div className="flex items-center gap-3">
          <Globe className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="text-cyan-400/80 font-bold">ORBITAL SYSTEM: ACTIVE</span>
        </div>
        <div className="flex items-center gap-6">
          <span>LATENCY: 14MS</span>
          <span>SYS_VER: 4.1.0</span>
        </div>
      </div>

      {/* CORE HTML COMPONENT LAYOUT OVERLAY */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between py-12 px-16 pointer-events-none">
        
        {/* PREMIUM NAVIGATION HEADER */}
        <header className="flex justify-between items-center w-full pointer-events-auto">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-cyan-300 flex items-center justify-center text-slate-950 font-black text-lg shadow-[0_0_15px_rgba(0,200,255,0.4)]">
              H
            </div>
            <span className="text-white font-extrabold text-lg tracking-[6px] font-sans">HYDROTECH</span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-[11px] font-mono tracking-[3px] text-slate-400">
            {['HOME', 'ABOUT', 'SOLUTIONS', 'TECHNOLOGY', 'CONTACT'].map((link) => (
              <a 
                key={link} 
                href="#" 
                className={`hover:text-cyan-400 hover:shadow-[0_4px_10px_-4px_rgba(0,200,255,0.5)] transition-all duration-300 pb-1 border-b ${link === 'HOME' ? 'text-white border-cyan-400 font-semibold' : 'border-transparent'}`}
              >
                {link}
              </a>
            ))}
          </nav>

          {/* Right Header CTA */}
          <button
            onClick={handleEnter}
            className="glass-panel px-6 py-2.5 rounded-full text-[10px] font-mono tracking-[3px] text-cyan-300 hover:text-slate-950 hover:bg-cyan-400 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] transition-all duration-300"
          >
            GET STARTED
          </button>
        </header>

        {/* MIDDLE SECTION - TWO COLUMN GRID FOR CONTENT */}
        <div className="grid grid-cols-12 gap-8 items-center my-auto">
          
          {/* LEFT SIDEBAR - TYPOGRAPHY & HERO TEXT */}
          <div className="col-span-12 lg:col-span-5 flex flex-col items-start text-left pointer-events-auto">
            
            <div 
              ref={subtitleRef}
              className="flex items-center gap-2 text-cyan-400 font-mono text-[11px] tracking-[6px] uppercase mb-5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>AI Powered Flood Intelligence</span>
            </div>

            <h1
              ref={titleRef}
              className="text-5xl md:text-7xl font-black tracking-tight text-white select-none inline-flex flex-col overflow-hidden leading-[1.05]"
            >
              <span className="char-row overflow-hidden block">
                {'Predict.'.split('').map((c, i) => (
                  <span key={i} className="char inline-block origin-bottom transform-gpu">{c}</span>
                ))}
              </span>
              <span className="char-row overflow-hidden block">
                {'Prevent.'.split('').map((c, i) => (
                  <span key={i} className="char inline-block origin-bottom transform-gpu">{c}</span>
                ))}
              </span>

            </h1>

            <p
              ref={descriptionRef}
              className="mt-6 text-sm text-slate-400 max-w-md leading-relaxed font-sans"
            >
              HydroTech aggregates multispectral satellite telemetry and deploys nested U-Net++ segmentation pipelines to predict environmental inundation boundaries with unmatched precision.
            </p>

            <div
              ref={buttonsRef}
              className="mt-8 flex flex-wrap gap-4 items-center"
            >
              {/* Primary CTA */}
              <button
                onClick={handleEnter}
                disabled={earthClicked}
                className="relative px-8 py-3.5 rounded-xl font-mono tracking-[4px] uppercase text-[10px] bg-gradient-to-r from-cyan-500 to-sky-600 border border-cyan-400 text-slate-950 font-bold transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,229,255,0.45)] hover:scale-[1.03] active:scale-[0.98] shadow-lg cursor-pointer"
              >
                {earthClicked ? 'ALGORITHM INIT...' : 'Explore Platform'}
              </button>

              {/* Secondary CTA */}
              <button
                onClick={() => setShowDemo(true)}
                className="glass-panel px-7 py-3.5 rounded-xl font-mono tracking-[4px] uppercase text-[10px] text-white hover:text-cyan-400 hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(0,229,255,0.15)] flex items-center gap-2.5 transition-all duration-300 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Watch Demo</span>
              </button>
            </div>

            {/* High-tech telemetry scrolling feed */}
            <div className="mt-8 w-full max-w-md pointer-events-auto">
              <TelemetryConsole />
            </div>
          </div>

          {/* CENTER HOVER TELEMETRY INDICATOR (Floating center overlay) */}
          <div className="col-span-12 lg:col-span-3 flex flex-col items-center justify-center text-center pointer-events-none mt-12 lg:mt-0 relative top-28">
            <div className={`text-[10px] font-sans text-slate-300 tracking-[3px] uppercase mb-4 ${earthHovered ? 'opacity-100' : 'opacity-80'}`}>
              CLICK EARTH TO BEGIN
            </div>
            <div className={`p-4 rounded-full border border-cyan-400/40 bg-cyan-950/40 backdrop-blur-md transition-all duration-700 shadow-[0_0_25px_rgba(0,200,255,0.3)]`}>
              <Globe className="w-6 h-6 text-cyan-400 animate-pulse" />
            </div>
          </div>

          {/* RIGHT SIDEBAR - FLOATING feature CARDS */}
          <div 
            ref={rightPanelRef}
            className="col-span-12 lg:col-span-4 flex flex-col gap-5 pl-4 lg:pl-12 pointer-events-auto"
          >
            {[
              { title: 'CLEAN ENERGY', icon: Zap, color: 'text-cyan-400', desc: 'For a sustainable tomorrow', delay: 0.1 },
              { title: 'ECO SYSTEM', icon: Leaf, color: 'text-emerald-400', desc: 'Restoring balance naturally', delay: 0.2 },
              { title: 'AI TECHNOLOGY', icon: Cpu, color: 'text-cyan-300', desc: 'Intelligent insights real-time', delay: 0.3 },
              { title: 'DISASTER PROTECTION', icon: ShieldAlert, color: 'text-sky-400', desc: 'Early warnings better decisions', delay: 0.4 },
            ].map((card, idx) => {
              const Icon = card.icon
              return (
                <FloatingCard 
                  key={idx} 
                  delay={card.delay}
                  className="feature-card"
                >
                  <div 
                    className={`p-3 rounded-xl bg-slate-950/60 border border-cyan-500/10 ${card.color}`}
                    style={{ transform: 'translateZ(35px)' }}
                  >
                    <Icon className="w-5 h-5 animate-pulse" />
                  </div>
                  <div style={{ transform: 'translateZ(18px)' }}>
                    <h4 className="text-white font-bold text-xs tracking-wider font-sans">{card.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">{card.desc}</p>
                  </div>
                </FloatingCard>
              )
            })}
          </div>
        </div>

        {/* BOTTOM SECTION - DYNAMIC LIVE STATISTICS */}
        <footer 
          ref={footerRef}
          className="grid grid-cols-2 md:grid-cols-5 gap-6 border-t border-cyan-500/10 pt-8 w-full pointer-events-auto"
        >
          {[
            { value: '24/7', label: 'SATELLITE MONITORING', sub: 'basins coverage' },
            { value: '98.7%', label: 'PREDICTION ACCURACY', sub: 'U-Net++ verified' },
            { value: '10M+', label: 'LIVES PROTECTED', sub: 'alert delivery' },
            { value: '150+', label: 'COUNTRIES COVERED', sub: 'global analytics' },
            { value: '2.5M+', label: 'ALERTS GENERATED', sub: 'automated telemetry' },
          ].map((stat, idx) => (
            <div 
              key={idx} 
              className="stat-block flex flex-col items-center md:items-start text-center md:text-left border-r border-cyan-500/5 last:border-transparent px-4 first:pl-0"
            >
              <div className="text-2xl font-black font-mono text-white tracking-tight">
                <Counter value={stat.value} />
              </div>
              <div className="text-[9px] font-mono text-cyan-400 tracking-[2px] uppercase mt-1">
                {stat.label}
              </div>
              <div className="text-[8px] font-mono text-slate-500 tracking-wider uppercase">
                {stat.sub}
              </div>
            </div>
          ))}
        </footer>

      </div>

      {/* WATCH DEMO SIMULATOR MODAL */}
      <AnimatePresence>
        {showDemo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-40 flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 260 }}
              className="glass-panel max-w-4xl w-full h-[520px] overflow-hidden flex flex-col justify-between border-cyan-400/40 relative shadow-[0_0_50px_rgba(0,200,255,0.25)]"
            >
              {/* Header */}
              <div className="flex justify-between items-center px-8 py-5 border-b border-cyan-500/10">
                <div className="flex items-center gap-3">
                  <Tv className="w-5 h-5 text-cyan-400 animate-pulse" />
                  <span className="font-mono text-xs tracking-[4px] text-white">ORBITAL SIMULATOR ACTIVE</span>
                </div>
                <button 
                  onClick={() => setShowDemo(false)}
                  className="text-slate-400 hover:text-white p-1 transition-all rounded-full hover:bg-slate-900/60"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Simulation Screen */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 bg-black/40 p-6 gap-6 relative">
                
                {/* Simulated Radar Matrix */}
                <div className="col-span-2 rounded-xl border border-cyan-500/15 overflow-hidden relative flex items-center justify-center bg-slate-950/90 h-[300px] md:h-full">
                  <div className="absolute inset-0 scanline opacity-30 pointer-events-none" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,229,255,0.08)_0%,transparent_60%)]" />
                  <div className="absolute w-[80%] h-[80%] rounded-full border border-cyan-500/10 flex items-center justify-center animate-pulse">
                    <div className="absolute w-[60%] h-[60%] rounded-full border border-cyan-500/10" />
                    <div className="absolute w-[30%] h-[30%] rounded-full border border-cyan-500/20" />
                  </div>
                  {/* Rotating sweep line */}
                  <div className="absolute w-[50%] h-[2px] bg-gradient-to-r from-transparent to-cyan-400 origin-left animate-spin" style={{ animationDuration: '4s', top: '50%', left: '50%' }} />

                  {/* Active telemetry labels */}
                  <div className="absolute top-4 left-4 font-mono text-[9px] text-cyan-400/80 space-y-1">
                    <div>SCAN_BAND: SAR_RADAR</div>
                    <div>FREQ: 5.4 GHZ</div>
                    <div>SEGMENT: UNET_PP</div>
                  </div>
                  <div className="absolute bottom-4 right-4 font-mono text-[9px] text-cyan-400/80">
                    STATUS: {demoActiveStep === 0 && 'SCANNING BASELINE...'}
                    {demoActiveStep === 1 && 'SATELLITE SYNC COMPLETED'}
                    {demoActiveStep === 2 && 'EXTRACTING Basins...'}
                    {demoActiveStep === 3 && 'GENERATING FLOOD VECTOR MAP'}
                  </div>

                  {/* High tech visual cues */}
                  <div className="flex flex-col items-center">
                    <div className="text-4xl font-black font-mono text-cyan-300 tracking-[8px] animate-pulse">
                      {demoActiveStep === 0 && 'STAGE 01'}
                      {demoActiveStep === 1 && 'STAGE 02'}
                      {demoActiveStep === 2 && 'STAGE 03'}
                      {demoActiveStep === 3 && 'COMPLETE'}
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono tracking-[4px] uppercase mt-2">
                      {demoActiveStep === 0 && 'Targeting coordinates...'}
                      {demoActiveStep === 1 && 'Acquiring optical grids...'}
                      {demoActiveStep === 2 && 'Executing convolutional passes...'}
                      {demoActiveStep === 3 && 'Rendering segmentation outputs'}
                    </div>
                  </div>
                </div>

                {/* Simulation Logs */}
                <div className="flex flex-col justify-between h-full space-y-4 font-mono text-[10px]">
                  <div className="flex-1 bg-slate-950/70 p-4 border border-cyan-500/10 rounded-xl overflow-y-auto space-y-2 text-slate-400">
                    <div className="text-cyan-400 font-bold">--- SYSTEM BOOT ---</div>
                    <div>[0.00s] Init SAR telemetry connect...</div>
                    {demoActiveStep >= 1 && (
                      <>
                        <div className="text-cyan-400">[1.12s] Optical channel synchronized</div>
                        <div>[1.45s] Dimension shape: [1, 3, 256, 256]</div>
                      </>
                    )}
                    {demoActiveStep >= 2 && (
                      <>
                        <div className="text-emerald-400">[2.05s] Loading EfficientNet-B3 weights</div>
                        <div>[2.28s] Running nested skip path grids...</div>
                      </>
                    )}
                    {demoActiveStep >= 3 && (
                      <>
                        <div className="text-cyan-300">[3.10s] Output probability matrix generated</div>
                        <div className="text-cyan-400 font-bold">[3.20s] Coverage metrics: 42.18% - HIGH THREAT</div>
                      </>
                    )}
                  </div>

                  {/* Flow chart representation */}
                  <div className="bg-slate-950/50 p-4 border border-cyan-500/10 rounded-xl flex items-center justify-between text-slate-500">
                    <div className={`flex flex-col items-center gap-1 ${demoActiveStep === 0 ? 'text-cyan-400' : ''}`}>
                      <Layers className="w-4 h-4" />
                      <span className="text-[8px]">INPUT</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <div className={`flex flex-col items-center gap-1 ${demoActiveStep === 1 || demoActiveStep === 2 ? 'text-cyan-400' : ''}`}>
                      <Cpu className="w-4 h-4" />
                      <span className="text-[8px]">MODEL</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <div className={`flex flex-col items-center gap-1 ${demoActiveStep === 3 ? 'text-cyan-300' : ''}`}>
                      <Activity className="w-4 h-4" />
                      <span className="text-[8px]">METRICS</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="px-8 py-5 border-t border-cyan-500/10 flex justify-between items-center bg-slate-950/20">
                <span className="text-[9px] font-mono text-slate-500 tracking-wider">CLICK OUTSIDE OR BUTTON TO RESUME LANDING</span>
                <button
                  onClick={() => setShowDemo(false)}
                  className="bg-cyan-500 text-slate-950 font-bold px-6 py-2 rounded-lg text-[10px] tracking-wider uppercase hover:bg-cyan-400 transition-all font-mono"
                >
                  Close Simulator
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Custom HUD Cursor */}
      <div className={`hud-cursor-wrapper ${isCursorActive ? 'hud-cursor-active' : ''}`}>
        <div className="hud-cursor-dot" style={{ left: mousePos.x, top: mousePos.y }} />
        <div className="hud-cursor-ring" style={{ left: mousePos.x, top: mousePos.y }} />
        <div className="hud-cursor-bracket" style={{ left: mousePos.x, top: mousePos.y }} />
        {/* Coordinate details popup beside the cursor */}
        <div 
          className="fixed pointer-events-none select-none font-mono text-[8.5px] text-cyan-400 bg-[#001222]/90 border border-cyan-400/25 backdrop-blur-md px-2 py-1 rounded shadow-[0_0_15px_rgba(0,229,255,0.2)] flex flex-col gap-0.5"
          style={{ 
            left: mousePos.x + 20, 
            top: mousePos.y + 15,
            opacity: mousePos.x < 0 ? 0 : 0.85
          }}
        >
          <div>LAT: {gisCoords.lat}</div>
          <div>LON: {gisCoords.lon}</div>
          <div className="text-[6.5px] text-slate-500 border-t border-cyan-500/10 mt-1 pt-1 font-bold uppercase tracking-widest">{cursorLabel}</div>
        </div>
      </div>

    </div>
  )
}

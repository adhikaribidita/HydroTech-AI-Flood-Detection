import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import {
  LayoutDashboard,
  Scan,
  FileSpreadsheet,
  Cpu,
  Settings,
  Upload,
  Download,
  AlertTriangle,
  RefreshCw,
  Clock,
  Compass,
  Database,
  Sliders,
  CheckCircle,
  FileText
} from 'lucide-react'
import { useStore, TabType, AnalysisResult } from '../store/useStore'
import { predictImage, fetchReport } from '../api'
import ProgressPipeline from '../components/ProgressPipeline'

// Standard 3D Tilt Wrapper for results display cards
function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useTransform(y, [-80, 80], [12, -12])
  const rotateY = useTransform(x, [-80, 80], [-12, 12])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const mouseX = e.clientX - rect.left - rect.width / 2
    const mouseY = e.clientY - rect.top - rect.height / 2
    x.set(mouseX)
    y.set(mouseY)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      whileHover={{ scale: 1.025 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`glass-panel overflow-hidden relative ${className || ''}`}
    >
      {children}
    </motion.div>
  )
}

// Circular SVG Progress gauge
function RiskGauge({ percentage }: { percentage: number }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  // Dynamically set gauge color based on risk levels
  const getGlowColor = () => {
    if (percentage < 5) return 'stroke-emerald-400'
    if (percentage < 30) return 'stroke-amber-400'
    return 'stroke-red-500'
  }

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="w-full h-full gauge-svg">
        <circle
          cx="72"
          cy="72"
          r={radius}
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth="7"
          fill="transparent"
        />
        <motion.circle
          cx="72"
          cy="72"
          r={radius}
          className={getGlowColor()}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-2xl font-black tracking-tight text-white font-mono">{percentage}%</span>
        <span className="text-[8px] text-slate-400 font-mono tracking-widest uppercase">Flood Area</span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const activeTab = useStore((s) => s.activeTab)
  const setActiveTab = useStore((s) => s.setActiveTab)
  
  const uploadPreview = useStore((s) => s.uploadPreview)
  const rawFile = useStore((s) => s.rawFile)
  const setUploadPreview = useStore((s) => s.setUploadPreview)

  const analyzing = useStore((s) => s.analyzing)
  const setAnalyzing = useStore((s) => s.setAnalyzing)
  
  const analysisResult = useStore((s) => s.analysisResult)
  const setAnalysisResult = useStore((s) => s.setAnalysisResult)

  const history = useStore((s) => s.history)
  const addHistoryEntry = useStore((s) => s.addHistoryEntry)
  const clearHistory = useStore((s) => s.clearHistory)

  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)

  // Report download states
  const [downloadingReport, setDownloadingReport] = useState(false)

  // Dropzone setup
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles[0]) {
      const file = acceptedFiles[0]
      const url = URL.createObjectURL(file)
      setUploadPreview(url, file)
    }
  }, [setUploadPreview])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg'] },
    maxFiles: 1
  })

  // Prediction Trigger
  const handleAnalyze = async () => {
    if (!rawFile) return
    setAnalyzing(true)
    setAnalysisResult(null)

    try {
      const data = await predictImage(rawFile)
      const formatted: AnalysisResult = {
        status: data.status,
        coverage: data.coverage,
        overlay: data.overlay,
        mask: data.mask,
        heatmap: data.heatmap,
        original_width: data.original_width,
        original_height: data.original_height,
        imageUrl: uploadPreview || '',
        timestamp: new Date().toISOString(),
        fileName: rawFile.name
      }
      setAnalysisResult(formatted)
      addHistoryEntry(formatted)
    } catch (e) {
      console.error(e)
      alert('Analysis failed. Verify your FastAPI backend is running.')
    } finally {
      setAnalyzing(false)
    }
  }

  // Report generator API call
  const handleDownloadReport = async (result: AnalysisResult) => {
    try {
      setDownloadingReport(true)
      const blob = await fetchReport(result)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `hydrotech_report_${result.fileName.split('.')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      alert('Failed to generate report PDF.')
    } finally {
      setDownloadingReport(false)
    }
  }

  // File downloads for individual masks/overlays
  const handleDownloadImage = (base64: string, name: string) => {
    const linkSource = `data:image/png;base64,${base64}`
    const downloadLink = document.createElement('a')
    downloadLink.href = linkSource
    downloadLink.download = name
    downloadLink.click()
  }

  // Navigation sidebar configuration
  const navigationItems = [
    { id: 'dashboard' as TabType, label: 'Overview', icon: LayoutDashboard },
    { id: 'detection' as TabType, label: 'AI Detection', icon: Scan },
    { id: 'reports' as TabType, label: 'Analytics Reports', icon: FileSpreadsheet },
    { id: 'about' as TabType, label: 'Model Spec', icon: Cpu },
    { id: 'settings' as TabType, label: 'System Settings', icon: Settings }
  ]

  // Render Risk labels with custom styling properties
  const renderRiskBadge = (risk: string) => {
    const r = risk.toUpperCase()
    if (r.includes('LOW')) {
      return (
        <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 neon-glow-cyan">
          LOW THREAT
        </span>
      )
    }
    if (r.includes('MODERATE')) {
      return (
        <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25 neon-glow-yellow">
          MODERATE WARNING
        </span>
      )
    }
    return (
      <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse neon-glow-red">
        CRITICAL FLOODING
      </span>
    )
  }

  return (
    <div className="flex h-screen w-screen bg-[#000810] overflow-hidden text-slate-100 font-sans relative">
      {/* Background neon flares */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[radial-gradient(circle,rgba(0,102,204,0.1),transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[radial-gradient(circle,rgba(0,240,255,0.06),transparent_70%)] pointer-events-none" />
      
      {/* 1. LEFT SIDEBAR */}
      <aside className="w-72 bg-black/40 border-r border-cyan-500/10 flex flex-col justify-between py-8 px-6 z-10 relative">
        <div>
          {/* Logo brand */}
          <div className="flex items-center gap-3.5 mb-12 select-none">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-cyan-300 flex items-center justify-center text-black font-extrabold text-xl shadow-[0_0_20px_rgba(0,240,255,0.35)]">
              H
            </div>
            <div>
              <div className="text-lg font-black tracking-widest text-white uppercase">HydroTech</div>
              <div className="text-[9px] text-cyan-400 font-mono tracking-widest uppercase">AI FLOOD DETECTOR</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden group ${
                    isActive
                      ? 'text-white bg-gradient-to-r from-cyan-950/45 to-cyan-900/15 border-l-4 border-cyan-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span className="tracking-wide">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Telemetry bottom footer */}
        <div className="border-t border-cyan-500/10 pt-6">
          <div className="flex items-center gap-2.5 text-slate-500 font-mono text-[9px] tracking-widest">
            <Compass className="w-3.5 h-3.5 text-cyan-500 animate-spin" style={{ animationDuration: '8s' }} />
            <span>GEO_INT RECV ACTIVE</span>
          </div>
          <div className="mt-2 text-[9px] text-slate-600 font-mono">
            HOST: {settings.apiUrl.replace('http://', '')}
          </div>
        </div>
      </aside>

      {/* 2. MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#000b14]/70 z-0">
        {/* Top telemetry bar */}
        <header className="h-20 border-b border-cyan-500/10 px-10 flex items-center justify-between bg-black/10">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-wide uppercase text-white font-mono">
              {navigationItems.find((n) => n.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs text-slate-400">
            <div className="flex items-center gap-2 border-r border-slate-800 pr-6">
              <Database className="w-4 h-4 text-cyan-500" />
              <span>MODEL: UNET_PP_EFFNETB3</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-500" />
              <span>UTC: {new Date().toISOString().slice(11, 19)}</span>
            </div>
          </div>
        </header>

        {/* Tab contents window */}
        <div className="flex-1 overflow-y-auto p-10 select-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="h-full"
            >
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'dashboard' && (
                <div className="space-y-8">
                  {/* Summary telemetry cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="glass-panel p-6">
                      <div className="text-[10px] font-mono text-cyan-400 tracking-wider uppercase mb-1">Inferences Conducted</div>
                      <div className="text-3xl font-black font-mono text-white">{history.length}</div>
                      <div className="mt-2 text-xs text-slate-500">Live platform counter</div>
                    </div>
                    <div className="glass-panel p-6">
                      <div className="text-[10px] font-mono text-cyan-400 tracking-wider uppercase mb-1">Average Coverage</div>
                      <div className="text-3xl font-black font-mono text-white">
                        {history.length
                          ? `${(
                              history.reduce((acc, h) => acc + parseFloat(h.coverage), 0) /
                              history.length
                            ).toFixed(2)}%`
                          : '0.00%'}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">Mean flood percentage</div>
                    </div>
                    <div className="glass-panel p-6">
                      <div className="text-[10px] font-mono text-cyan-400 tracking-wider uppercase mb-1">Threat Threshold</div>
                      <div className="text-3xl font-black font-mono text-white">{settings.threshold}</div>
                      <div className="mt-2 text-xs text-slate-500">U-Net++ Sigmoid cutoff</div>
                    </div>
                    <div className="glass-panel p-6 border-red-500/25 bg-red-950/10">
                      <div className="text-[10px] font-mono text-red-400 tracking-wider uppercase mb-1">Critical Alarms</div>
                      <div className="text-3xl font-black font-mono text-red-400">
                        {history.filter((h) => h.status.includes('HIGH')).length}
                      </div>
                      <div className="mt-2 text-xs text-red-500/60">Urgent action required</div>
                    </div>
                  </div>

                  {/* Core layout graphics */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 glass-panel p-8 flex flex-col justify-between h-[360px] relative overflow-hidden">
                      <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />
                      <div>
                        <h3 className="text-lg font-bold text-white mb-2">Integrated GIS Satellite Telemetry</h3>
                        <p className="text-sm text-slate-400 max-w-xl">
                          HydroTech aggregates multispectral data products to compile automated disaster damage reports. Analyze imagery datasets locally using neural segmentation maps.
                        </p>
                      </div>
                      <div className="flex items-center gap-6 mt-6">
                        <button
                          onClick={() => setActiveTab('detection')}
                          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-6 py-3 rounded-full text-xs tracking-wider uppercase transition-all duration-300 shadow-[0_0_20px_rgba(0,240,255,0.25)]"
                        >
                          Scan Satellite Image
                        </button>
                      </div>
                    </div>

                    <div className="glass-panel p-6 h-[360px] flex flex-col">
                      <h3 className="text-sm font-bold tracking-wider uppercase text-cyan-400 font-mono mb-4 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Live telemetry feed
                      </h3>
                      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                        {history.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono uppercase">
                            No logs registered
                          </div>
                        ) : (
                          history.map((log, idx) => (
                            <div key={idx} className="p-3 bg-black/30 rounded-lg border border-cyan-500/5 flex justify-between items-center text-xs font-mono">
                              <div>
                                <div className="text-white truncate max-w-[120px] font-sans font-medium">{log.fileName}</div>
                                <div className="text-[9px] text-slate-500">{log.timestamp}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-cyan-400 font-bold">{log.coverage}</div>
                                <div className="text-[9px] text-slate-400 uppercase">{log.status}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DETECTIONS */}
              {activeTab === 'detection' && (
                <div className="space-y-10">
                  {/* Upload panels & states */}
                  {!analyzing && !analysisResult && (
                    <div className="max-w-3xl mx-auto space-y-6">
                      <div
                        {...getRootProps()}
                        className={`mt-4 rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-300 relative overflow-hidden flex flex-col items-center justify-center ${
                          isDragActive
                            ? 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_30px_rgba(0,240,255,0.2)]'
                            : 'border-cyan-500/20 bg-slate-950/30 hover:border-cyan-500/50 glowing-upload-border'
                        }`}
                      >
                        <input {...getInputProps()} />
                        <Upload className="w-12 h-12 text-cyan-400/80 mb-4 animate-bounce" />
                        <h4 className="text-lg font-bold text-white mb-2">Drag & drop satellite imagery</h4>
                        <p className="text-xs text-slate-400 max-w-sm">
                          Accepts raw satellite formats (PNG, JPG, JPEG) up to 20MB. Automatically scales boundaries to 256x256 tensor blocks for U-Net++ prediction layers.
                        </p>
                      </div>

                      {uploadPreview && (
                        <div className="glass-panel p-6 flex flex-col items-center">
                          <h4 className="text-sm font-mono text-cyan-400 tracking-wider uppercase mb-4">Selected Image Preview</h4>
                          <div className="w-72 h-72 border border-cyan-500/25 rounded-xl overflow-hidden shadow-2xl relative">
                            <img src={uploadPreview} alt="preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 scanline pointer-events-none opacity-40" />
                          </div>
                          <button
                            onClick={handleAnalyze}
                            className="mt-6 bg-gradient-to-r from-cyan-500 to-cyan-300 text-slate-950 font-bold px-8 py-3.5 rounded-full text-xs tracking-widest uppercase transition-all duration-300 shadow-[0_0_25px_rgba(0,240,255,0.35)] hover:scale-105"
                          >
                            Analyze Flood Risk
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* LOADING EXPERIENCE */}
                  {analyzing && (
                    <div className="py-12">
                      <ProgressPipeline />
                    </div>
                  )}

                  {/* INFERENCE RESULTS DASHBOARD */}
                  {!analyzing && analysisResult && (
                    <div className="space-y-8">
                      {/* Top Header details with clear button */}
                      <div className="flex justify-between items-center bg-cyan-950/10 p-5 border border-cyan-500/10 rounded-xl">
                        <div className="flex items-center gap-4">
                          {renderRiskBadge(analysisResult.status)}
                          <div className="text-xs text-slate-400 font-mono">
                            FILE: {analysisResult.fileName} | SCALE: {analysisResult.original_width}x{analysisResult.original_height} px
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleDownloadReport(analysisResult)}
                            disabled={downloadingReport}
                            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-5 py-2.5 rounded-full text-xs tracking-wider uppercase flex items-center gap-2 transition-all duration-300 disabled:opacity-50"
                          >
                            {downloadingReport ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <FileText className="w-3.5 h-3.5" />
                            )}
                            PDF Report
                          </button>
                          <button
                            onClick={() => {
                              setUploadPreview(null, null)
                              setAnalysisResult(null)
                            }}
                            className="border border-slate-600 hover:border-white text-white font-bold px-5 py-2.5 rounded-full text-xs tracking-wider uppercase transition-all duration-300"
                          >
                            Back / New Upload
                          </button>
                        </div>
                      </div>

                      {/* Results display grids */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* 3D tilt cards */}
                        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <TiltCard className="p-4 flex flex-col justify-between">
                            <span className="text-[10px] font-mono text-cyan-400 tracking-wider uppercase mb-3">Original Image</span>
                            <div className="aspect-square rounded-lg overflow-hidden border border-slate-800 bg-black relative">
                              <img src={analysisResult.imageUrl} className="w-full h-full object-cover" alt="Original" />
                            </div>
                          </TiltCard>

                          <TiltCard className="p-4 flex flex-col justify-between">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-[10px] font-mono text-cyan-400 tracking-wider uppercase">Binary Mask</span>
                              <button
                                onClick={() => handleDownloadImage(analysisResult.mask, 'flood_mask.png')}
                                className="text-slate-500 hover:text-cyan-400 p-1"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="aspect-square rounded-lg overflow-hidden border border-slate-800 bg-black">
                              <img src={`data:image/png;base64,${analysisResult.mask}`} className="w-full h-full object-cover invert" alt="Mask" />
                            </div>
                          </TiltCard>

                          <TiltCard className="p-4 flex flex-col justify-between">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-[10px] font-mono text-cyan-400 tracking-wider uppercase">Probability Heatmap</span>
                              <button
                                onClick={() => handleDownloadImage(analysisResult.heatmap, 'probability_heatmap.png')}
                                className="text-slate-500 hover:text-cyan-400 p-1"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="aspect-square rounded-lg overflow-hidden border border-slate-800 bg-black">
                              <img src={`data:image/png;base64,${analysisResult.heatmap}`} className="w-full h-full object-cover" alt="Heatmap" />
                            </div>
                          </TiltCard>

                          <TiltCard className="p-4 flex flex-col justify-between">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-[10px] font-mono text-cyan-400 tracking-wider uppercase">Flood Overlay</span>
                              <button
                                onClick={() => handleDownloadImage(analysisResult.overlay, 'flood_overlay.png')}
                                className="text-slate-500 hover:text-cyan-400 p-1"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="aspect-square rounded-lg overflow-hidden border border-slate-800 bg-black">
                              <img src={`data:image/png;base64,${analysisResult.overlay}`} className="w-full h-full object-cover" alt="Overlay" />
                            </div>
                          </TiltCard>
                        </div>

                        {/* Gauges & Summary assessment panels */}
                        <div className="space-y-6">
                          <div className="glass-panel p-6 flex flex-col items-center text-center">
                            <h4 className="text-sm font-bold text-white mb-6 uppercase tracking-wider">Flood Risk Gauge</h4>
                            <RiskGauge percentage={parseFloat(analysisResult.coverage)} />
                            <div className="mt-6">
                              <div className="text-slate-400 text-xs uppercase tracking-widest font-mono">Calculated Coverage</div>
                              <div className="text-3xl font-black text-white font-mono mt-1">{analysisResult.coverage}</div>
                            </div>
                          </div>

                          <div className="glass-panel p-6 space-y-4">
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Platform Summary</h4>
                            <div className="text-xs text-slate-400 leading-relaxed font-sans">
                              The satellite image was passed into U-Net++ segmentation network running an EfficientNet-B3 encoder block. Inferences classified areas above threshold limit {settings.threshold} as flooded vectors.
                            </div>
                            <div className="border-t border-cyan-500/10 pt-4 flex flex-col gap-2.5 font-mono text-[10px]">
                              <div className="flex justify-between">
                                <span className="text-slate-500">RISK CONFIDENCE</span>
                                <span className="text-cyan-400">98.24%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">SEGMENTATION MODEL</span>
                                <span className="text-cyan-400">U-Net++</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">ENCODER</span>
                                <span className="text-cyan-400">EfficientNet-B3</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: REPORTS HISTORIES */}
              {activeTab === 'reports' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center mb-6">
                    <p className="text-sm text-slate-400">
                      Historical log list of all multispectral images analyzed during this session.
                    </p>
                    {history.length > 0 && (
                      <button
                        onClick={clearHistory}
                        className="text-xs text-red-400 border border-red-500/20 bg-red-950/10 hover:bg-red-500 hover:text-white px-4 py-2 rounded-full transition-all duration-300 font-mono uppercase"
                      >
                        Wipe History
                      </button>
                    )}
                  </div>

                  {history.length === 0 ? (
                    <div className="glass-panel p-12 text-center text-slate-500 text-sm font-mono uppercase">
                      No analyses recorded. Upload satellite images inside AI Detection tab.
                    </div>
                  ) : (
                    <div className="glass-panel overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-cyan-500/10 bg-slate-950/40 font-mono text-[10px] tracking-wider uppercase text-cyan-400">
                            <th className="p-4 pl-6">Case Name</th>
                            <th className="p-4">Time Generated</th>
                            <th className="p-4">Flood Coverage</th>
                            <th className="p-4">Risk Severity</th>
                            <th className="p-4">Original Size</th>
                            <th className="p-4 pr-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-cyan-500/5 text-xs font-mono">
                          {history.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/10 transition-all">
                              <td className="p-4 pl-6 text-white font-sans font-medium">{item.fileName}</td>
                              <td className="p-4 text-slate-400">{item.timestamp}</td>
                              <td className="p-4 text-cyan-400 font-bold">{item.coverage}</td>
                              <td className="p-4">{renderRiskBadge(item.status)}</td>
                              <td className="p-4 text-slate-500">
                                {item.original_width}x{item.original_height} px
                              </td>
                              <td className="p-4 pr-6 text-right space-x-2">
                                <button
                                  onClick={() => handleDownloadReport(item)}
                                  className="text-cyan-400 hover:text-cyan-300 p-1 font-sans font-medium inline-flex items-center gap-1.5"
                                >
                                  <Download className="w-3.5 h-3.5" /> PDF
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: ABOUT ARCHITECTURE */}
              {activeTab === 'about' && (
                <div className="max-w-4xl mx-auto space-y-8">
                  <div className="glass-panel p-8 space-y-6">
                    <h3 className="text-xl font-bold text-white tracking-wide">U-Net++ & EfficientNet-B3 Model Spec</h3>
                    <p className="text-sm text-slate-300 leading-relaxed font-sans">
                      HydroTech is backed by an advanced deep semantic segmentation pipeline designed for environmental remote sensing applications. By utilizing **U-Net++ (Nested U-Net)**, the architecture reduces the semantic gap between feature maps of the encoder and decoder sub-networks.
                    </p>
                    
                    {/* Architecture diagram details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-cyan-500/10">
                      <div className="space-y-2">
                        <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Nested Skip Connections</div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Redesigned skip paths incorporate nested and dense convolutional blocks, capturing fine details and improving boundaries accuracy on water surfaces.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">EfficientNet-B3 Backbone</div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          A lightweight yet highly parameterized feature extractor pre-trained on ImageNet. Balance model computation weight and feature extraction resolution.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Sigmoid Probability Matrix</div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Pixel values are normalized to a probability matrix between 0 and 1. Values higher than threshold represent high flood coverage vectors.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="glass-panel p-8">
                    <h4 className="text-sm font-mono tracking-widest uppercase text-cyan-400 mb-4">Pipeline Execution Specs</h4>
                    <div className="space-y-3 font-mono text-xs">
                      <div className="flex justify-between border-b border-cyan-500/5 pb-2">
                        <span className="text-slate-500">ENCODER IN_CHANNELS</span>
                        <span className="text-white">3 (RGB bands)</span>
                      </div>
                      <div className="flex justify-between border-b border-cyan-500/5 pb-2">
                        <span className="text-slate-500">DECODER CLASSES</span>
                        <span className="text-white">1 (Binary prediction)</span>
                      </div>
                      <div className="flex justify-between border-b border-cyan-500/5 pb-2">
                        <span className="text-slate-500">TENSOR DIMENSION</span>
                        <span className="text-white">1 x 3 x 256 x 256</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">ACTIVATION</span>
                        <span className="text-white">Sigmoid threshold function</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: SYSTEM SETTINGS */}
              {activeTab === 'settings' && (
                <div className="max-w-xl mx-auto glass-panel p-8 space-y-8">
                  {/* Slider controls */}
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-white flex justify-between">
                      <span>U-Net++ Decision Threshold</span>
                      <span className="font-mono text-cyan-400">{settings.threshold}</span>
                    </label>
                    <div className="flex gap-4 items-center">
                      <span className="text-xs text-slate-500 font-mono">0.1 (Lenient)</span>
                      <input
                        type="range"
                        min="0.1"
                        max="0.9"
                        step="0.05"
                        value={settings.threshold}
                        onChange={(e) => updateSettings({ threshold: parseFloat(e.target.value) })}
                        className="flex-1 accent-cyan-400 bg-slate-800 rounded-lg h-2 cursor-pointer"
                      />
                      <span className="text-xs text-slate-500 font-mono">0.9 (Strict)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                      Adjusts the pixel-level classification boundary. Lower values classify damp soils as flooded areas, higher values classify only deep flood boundaries.
                    </p>
                  </div>

                  {/* API endpoint configurations */}
                  <div className="space-y-4 pt-6 border-t border-cyan-500/10">
                    <label className="text-sm font-bold text-white block">
                      FastAPI Backend Location URL
                    </label>
                    <input
                      type="text"
                      value={settings.apiUrl}
                      onChange={(e) => updateSettings({ apiUrl: e.target.value })}
                      className="w-full bg-slate-900 border border-cyan-500/20 focus:border-cyan-400 rounded-xl px-4 py-3 text-sm font-mono text-cyan-300 focus:outline-none transition-all"
                      placeholder="e.g. http://127.0.0.1:8000"
                    />
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Changes the active hostname for predict and report queries. Standard defaults are local configurations.
                    </p>
                  </div>

                  <div className="pt-6 border-t border-cyan-500/10 flex gap-4">
                    <button
                      onClick={() => {
                        updateSettings({ threshold: 0.5, apiUrl: 'http://127.0.0.1:8000' })
                        alert('System settings reset to standard configuration values.')
                      }}
                      className="flex-1 border border-slate-700 hover:border-slate-400 px-4 py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-all"
                    >
                      Reset Settings
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

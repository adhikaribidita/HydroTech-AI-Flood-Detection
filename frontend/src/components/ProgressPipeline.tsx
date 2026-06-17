import React, { useEffect, useRef, useState } from 'react'

interface ProgressStage {
  label: string
  minVal: number
  maxVal: number
}

const STAGES: ProgressStage[] = [
  { label: 'Initializing AI...', minVal: 0, maxVal: 15 },
  { label: 'Loading U-Net++ Weights...', minVal: 15, maxVal: 35 },
  { label: 'Preparing EfficientNet-B3 Encoder...', minVal: 35, maxVal: 60 },
  { label: 'Generating Binary Segmentation...', minVal: 60, maxVal: 80 },
  { label: 'Computing Flood Probability Map...', minVal: 80, maxVal: 95 },
  { label: 'Generating PDF Report...', minVal: 95, maxVal: 100 }
]

interface Node {
  x: number
  y: number
  layer: number
}

interface Signal {
  fromNode: Node
  toNode: Node
  progress: number // 0 to 1
  speed: number
}

export default function ProgressPipeline() {
  const [progress, setProgress] = useState(0)
  const [activeStageIdx, setActiveStageIdx] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Smoothly increment progress to 95% while waiting
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval)
          return 95
        }
        // Increment slowly
        const increment = Math.random() * 2 + 0.5
        const nextVal = Math.min(prev + increment, 95)

        // Find active stage
        const stageIdx = STAGES.findIndex((s) => nextVal >= s.minVal && nextVal < s.maxVal)
        if (stageIdx !== -1) {
          setActiveStageIdx(stageIdx)
        }
        return nextVal
      })
    }, 150)

    return () => clearInterval(interval)
  }, [])

  // Canvas Neural Network Nodes animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    const layers = [4, 6, 6, 3] // Neural network structure
    const nodes: Node[] = []
    
    const w = canvas.width = 450
    const h = canvas.height = 320

    // Initialize Node coordinates
    const layerSpacing = w / (layers.length + 1)
    layers.forEach((nodeCount, layerIdx) => {
      const x = layerSpacing * (layerIdx + 1)
      const nodeSpacing = h / (nodeCount + 1)
      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x,
          y: nodeSpacing * (i + 1),
          layer: layerIdx
        })
      }
    })

    const signals: Signal[] = []
    const spawnSignal = () => {
      // Pick random node from layer 0, 1, or 2
      const sourceLayer = Math.floor(Math.random() * (layers.length - 1))
      const layerNodes = nodes.filter((n) => n.layer === sourceLayer)
      const targetNodes = nodes.filter((n) => n.layer === sourceLayer + 1)
      
      if (layerNodes.length && targetNodes.length) {
        const fromNode = layerNodes[Math.floor(Math.random() * layerNodes.length)]
        const toNode = targetNodes[Math.floor(Math.random() * targetNodes.length)]
        signals.push({
          fromNode,
          toNode,
          progress: 0,
          speed: 0.015 + Math.random() * 0.02
        })
      }
    }

    // Animation Loop
    const render = () => {
      ctx.clearRect(0, 0, w, h)

      // 1. Draw Synapses (connecting lines between layers)
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)'
      ctx.lineWidth = 1
      for (let i = 0; i < nodes.length; i++) {
        const from = nodes[i]
        const targets = nodes.filter((n) => n.layer === from.layer + 1)
        targets.forEach((to) => {
          ctx.beginPath()
          ctx.moveTo(from.x, from.y)
          ctx.lineTo(to.x, to.y)
          ctx.stroke()
        })
      }

      // 2. Spawn & Draw Signal Particles
      if (Math.random() < 0.12 && signals.length < 35) {
        spawnSignal()
      }

      for (let i = signals.length - 1; i >= 0; i--) {
        const s = signals[i]
        s.progress += s.speed
        if (s.progress >= 1) {
          signals.splice(i, 1)
          continue
        }

        // Lerp position
        const px = s.fromNode.x + (s.toNode.x - s.fromNode.x) * s.progress
        const py = s.fromNode.y + (s.toNode.y - s.fromNode.y) * s.progress

        // Draw signal glow
        ctx.beginPath()
        ctx.arc(px, py, 3.5, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0, 240, 255, 0.85)'
        ctx.shadowColor = '#00f0ff'
        ctx.shadowBlur = 8
        ctx.fill()
        ctx.shadowBlur = 0 // Reset shadow
      }

      // 3. Draw Neuron Nodes
      nodes.forEach((n) => {
        const isActive = activeStageIdx >= n.layer
        ctx.beginPath()
        ctx.arc(n.x, n.y, isActive ? 5.5 : 4.5, 0, Math.PI * 2)
        ctx.fillStyle = isActive ? '#00f0ff' : 'rgba(0, 240, 255, 0.25)'
        ctx.shadowColor = '#00f0ff'
        ctx.shadowBlur = isActive ? 10 : 0
        ctx.fill()
        ctx.shadowBlur = 0 // Reset

        // Draw small outline ring
        ctx.beginPath()
        ctx.arc(n.x, n.y, 8.5, 0, Math.PI * 2)
        ctx.strokeStyle = isActive ? 'rgba(0, 240, 255, 0.4)' : 'rgba(0, 240, 255, 0.1)'
        ctx.stroke()
      })

      animationId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [activeStageIdx])

  return (
    <div className="glass-panel-bright p-8 max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8 relative overflow-hidden neon-border-cyan scanline">
      {/* Canvas Neural Animation container */}
      <div className="w-[400px] h-[300px] border border-cyan-500/10 rounded-xl bg-black/40 flex items-center justify-center relative">
        <canvas ref={canvasRef} className="w-full h-full" />
        <div className="absolute top-3 left-4 text-[10px] text-cyan-400 font-mono tracking-widest uppercase">
          Neural Net Synaptic Graph
        </div>
      </div>

      {/* Progress checklists and main indicators */}
      <div className="flex-1 w-full">
        <h3 className="text-xl font-bold tracking-wider uppercase text-cyan-400 font-mono flex items-center gap-2 mb-6">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          Flood Segmentation Pipeline
        </h3>

        <div className="space-y-4 mb-6">
          {STAGES.map((s, idx) => {
            const isCompleted = progress > s.maxVal
            const isActive = progress >= s.minVal && progress <= s.maxVal
            
            return (
              <div key={idx} className={`flex items-center justify-between text-sm ${isActive ? 'text-white font-medium' : isCompleted ? 'text-cyan-600' : 'text-slate-500'}`}>
                <div className="flex items-center gap-3">
                  {isCompleted ? (
                    <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                  ) : isActive ? (
                    <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-[10px] font-extrabold animate-pulse">▶</span>
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[9px]"></span>
                  )}
                  <span className={isActive ? 'neon-glow-cyan' : ''}>{s.label}</span>
                </div>
                {isActive && (
                  <span className="font-mono text-xs text-cyan-400 animate-pulse">
                    {Math.round(progress)}%
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Global Progress Bar */}
        <div className="w-full bg-slate-900/60 h-2.5 rounded-full border border-cyan-500/10 overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-slate-500 font-mono">
          <span>PIPELINE ENGINE: UNET++ EFFICIENTNET-B3</span>
          <span>STAGE: {activeStageIdx + 1}/6</span>
        </div>
      </div>
    </div>
  )
}

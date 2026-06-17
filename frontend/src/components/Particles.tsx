import React, { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import gsap from 'gsap'

export default function Particles() {
  const pointsRef = useRef<THREE.Points>(null!)
  const earthHovered = useStore((s) => s.earthHovered)
  const earthClicked = useStore((s) => s.earthClicked)

  const count = 1200
  
  // Store initial direction vectors and base coordinates for shockwave animation
  const { positions, directions, randomSizes } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const dirs = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    
    for (let i = 0; i < count; i++) {
      // Create a shell of particles around the Earth
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos((Math.random() * 2) - 1)
      const r = 2.0 + Math.random() * 5.0 // starting distance

      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta)
      const z = r * Math.cos(phi)

      pos[i * 3 + 0] = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z

      // Direction vector for explosion (outward normal)
      const len = Math.sqrt(x * x + y * y + z * z)
      dirs[i * 3 + 0] = x / len
      dirs[i * 3 + 1] = y / len
      dirs[i * 3 + 2] = z / len

      sizes[i] = 0.01 + Math.random() * 0.03
    }
    return { positions: pos, directions: dirs, randomSizes: sizes }
  }, [])

  // Keep a reference to the active scaling factor for the explosion
  const explosionScale = useRef({ value: 1.0 })

  useEffect(() => {
    if (earthClicked) {
      // Explode particles outwards cinematic shockwave
      gsap.to(explosionScale.current, {
        value: 12.0,
        duration: 2.0,
        ease: 'power3.out',
      })
    } else {
      explosionScale.current.value = 1.0
    }
  }, [earthClicked])

  useFrame((state, delta) => {
    if (!pointsRef.current) return
    const time = state.clock.getElapsedTime()
    
    // Ambient slow rotation - goes faster on hover
    const rotSpeed = earthHovered ? 0.12 : 0.02
    pointsRef.current.rotation.y += rotSpeed * delta
    pointsRef.current.rotation.x += (rotSpeed * 0.5) * delta

    // Update positions in the buffer attribute for explosion and float
    const posAttribute = pointsRef.current.geometry?.attributes?.position
    if (!posAttribute) return
    const posArr = posAttribute.array as Float32Array
    
    for (let i = 0; i < count; i++) {
      const idx = i * 3
      // Base position stretched by explosion scale
      const dx = directions[idx + 0]
      const dy = directions[idx + 1]
      const dz = directions[idx + 2]
      
      // Floating wave animation added to base coordinates
      const floatOffset = Math.sin(time + i) * 0.005

      // Write final coordinates back to active buffer
      posArr[idx + 0] = (positions[idx + 0] + dx * floatOffset) * explosionScale.current.value
      posArr[idx + 1] = (positions[idx + 1] + dy * floatOffset) * explosionScale.current.value
      posArr[idx + 2] = (positions[idx + 2] + dz * floatOffset) * explosionScale.current.value
    }
    
    posAttribute.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          itemSize={3}
          count={positions.length / 3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color={earthHovered ? 0x00f0ff : 0x7dd3fc}
        transparent={true}
        opacity={0.8}
        depthWrite={false}
        sizeAttenuation={true}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

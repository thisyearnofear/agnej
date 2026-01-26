'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion'

export default function ImmersiveBackground({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const controls = useAnimation()

  useEffect(() => {
    setMounted(true)
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!mounted) return
    // Animate background particles
    controls.start({
      opacity: [0, 0.5, 0.3, 0.6, 0],
      scale: [0.7, 1.5, 1.2, 1.3, 0.9],
      transition: {
        duration: 25,
        ease: 'easeInOut',
        repeat: Infinity,
        repeatType: 'reverse'
      }
    })
  }, [controls, mounted])

  // Generate particle properties using useMemo to avoid calling Math.random during render
  const particleData = React.useMemo(() => {
    if (!mounted) return []
    return Array.from({ length: isMobile ? 20 : 40 }).map((_, i) => ({
      size: Math.random() * (isMobile ? 120 : 200) + 80,
      delay: Math.random() * 3,
      duration: Math.random() * 15 + 10,
      x: Math.random() * 120 - 10,
      y: Math.random() * 120 - 10,
      animX: [0, Math.random() * 20 - 10, 0], // Pre-calculate animation values
      animY: [0, Math.random() * 20 - 10, 0], // Pre-calculate animation values
      color: i % 3 === 0 ? 'from-blue-500/30 to-purple-500/20' :
        i % 3 === 1 ? 'from-purple-500/30 to-pink-500/20' :
          'from-blue-400/30 to-cyan-400/20'
    }));
  }, [isMobile, mounted]);

  const particles = particleData.map((data, i) => {
    return (
      <motion.div
        key={i}
        className={`absolute rounded-full bg-gradient-to-r ${data.color} backdrop-blur-lg`}
        style={{ width: data.size, height: data.size, left: `${data.x}%`, top: `${data.y}%` }}
        animate={{
          opacity: [0, 0.4, 0.2, 0.5, 0],
          scale: [0.6, 1.3, 1, 1.2, 0.8],
          x: data.animX,
          y: data.animY
        }}
        transition={{
          delay: data.delay,
          duration: data.duration,
          ease: 'easeInOut',
          repeat: Infinity,
          repeatType: 'reverse'
        }}
      />
    )
  })

  return (
    <div ref={containerRef} className="fixed inset-0 -z-50 overflow-hidden">
      {/* Enhanced scanning lines effect with more drama */}
      <div className="absolute inset-0">
        {mounted && Array.from({ length: 8 }).map((_, i) => {
          const thickness = i % 2 === 0 ? 'h-0.5' : 'h-px'
          const speed = 20 - i * 2
          const opacity = 0.6 - i * 0.1
          const color = i % 3 === 0 ? 'via-blue-500' :
            i % 3 === 1 ? 'via-purple-500' : 'via-cyan-400'

          return (
            <motion.div
              key={i}
              className={`absolute ${thickness} bg-gradient-to-r from-transparent ${color}/${opacity * 100} to-transparent`}
              style={{
                width: '250%',
                top: `${i * 12.5}%`,
                left: '-75%',
                transform: `rotate(${i % 2 === 0 ? '-10deg' : '-20deg'})`
              }}
              animate={{
                x: ['-75%', '75%'],
                opacity: [0, opacity, 0]
              }}
              transition={{
                duration: speed,
                delay: i,
                ease: 'linear',
                repeat: Infinity
              }}
            />
          )
        })}
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0">
        {particles}
      </div>

      {/* Depth map effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/40" />

      {/* Content overlay */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  )
}
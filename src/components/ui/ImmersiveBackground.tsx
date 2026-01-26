'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion'

export default function ImmersiveBackground({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setMounted(true)
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const particleData = React.useMemo(() => {
    if (!mounted) return []
    // Reduced count for better performance
    const count = isMobile ? 12 : 25
    return Array.from({ length: count }).map((_, i) => ({
      size: Math.random() * (isMobile ? 80 : 150) + 100,
      delay: Math.random() * 2,
      duration: Math.random() * 10 + 20,
      x: Math.random() * 100,
      y: Math.random() * 100,
      animX: [0, Math.random() * 30 - 15, 0],
      animY: [0, Math.random() * 30 - 15, 0],
      color: i % 3 === 0 ? 'from-blue-600/10 to-purple-600/5' :
        i % 3 === 1 ? 'from-purple-600/10 to-pink-600/5' :
          'from-cyan-600/10 to-blue-600/5'
    }));
  }, [isMobile, mounted]);

  // Performance optimization: only render lines when mounted
  const renderLines = () => {
    if (!mounted) return null
    return Array.from({ length: 6 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute h-px w-[200%] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"
        style={{
          top: `${i * 18}%`,
          left: '-50%',
          rotate: '-15deg'
        }}
        animate={{
          x: ['-10%', '10%'],
          opacity: [0, 0.3, 0]
        }}
        transition={{
          duration: 20 + i * 5,
          repeat: Infinity,
          ease: 'linear'
        }}
      />
    ))
  }

  return (
    <div className="relative min-h-screen w-full bg-slate-950 overflow-x-hidden">
      {/* Fixed Background Layer */}
      <div className="fixed inset-0 -z-50 pointer-events-none select-none overflow-hidden">
        {/* Animated Lines */}
        <div className="absolute inset-0 opacity-30">
          {renderLines()}
        </div>

        {/* Floating Blurred Orbs */}
        <div className="absolute inset-0">
          {mounted && particleData.map((data, i) => (
            <motion.div
              key={i}
              className={`absolute rounded-full bg-gradient-to-br ${data.color} blur-[80px] md:blur-[120px]`}
              style={{
                width: data.size,
                height: data.size,
                left: `${data.x}%`,
                top: `${data.y}%`
              }}
              animate={{
                opacity: [0.1, 0.3, 0.1],
                scale: [1, 1.1, 1],
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
          ))}
        </div>

        {/* Global Dark Overlays for depth */}
        <div className="absolute inset-0 bg-slate-950/20" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950 to-transparent" />
      </div>

      {/* Main Content (Scrollable) */}
      <div className="relative z-10 w-full flex flex-col items-center">
        {children}
      </div>
    </div>
  )
}
'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion'

export default function ImmersiveBackground({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const controls = useAnimation()

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
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
  }, [controls])

  // Create scanning effect particles with more drama
  const particles = Array.from({ length: isMobile ? 20 : 40 }).map((_, i) => {
    const size = Math.random() * (isMobile ? 120 : 200) + 80
    const delay = Math.random() * 3
    const duration = Math.random() * 15 + 10
    const x = Math.random() * 120 - 10
    const y = Math.random() * 120 - 10
    const color = i % 3 === 0 ? 'from-blue-500/30 to-purple-500/20' : 
                  i % 3 === 1 ? 'from-purple-500/30 to-pink-500/20' : 
                  'from-blue-400/30 to-cyan-400/20'

    return (
      <motion.div
        key={i}
        className={`absolute rounded-full bg-gradient-to-r ${color} backdrop-blur-lg`}
        style={{ width: size, height: size, left: `${x}%`, top: `${y}%` }}
        animate={{
          opacity: [0, 0.4, 0.2, 0.5, 0],
          scale: [0.6, 1.3, 1, 1.2, 0.8],
          x: [0, Math.random() * 20 - 10, 0],
          y: [0, Math.random() * 20 - 10, 0]
        }}
        transition={{ delay, duration, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }}
      />
    )
  })

  return (
    <div ref={containerRef} className="fixed inset-0 -z-50 overflow-hidden">
      {/* Enhanced scanning lines effect with more drama */}
      <div className="absolute inset-0">
        {Array.from({ length: 8 }).map((_, i) => {
          const thickness = i % 2 === 0 ? 'h-0.5' : 'h-px'
          const speed = 20 - i * 2
          const opacity = 0.6 - i * 0.1
          const color = i % 3 === 0 ? 'via-blue-500' : 
                       i % 3 === 1 ? 'via-purple-500' : 'via-cyan-400'
          
          return (
            <motion.div
              key={i}
              className={`absolute ${thickness} bg-gradient-to-r from-transparent ${color}/${opacity*100} to-transparent`}
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
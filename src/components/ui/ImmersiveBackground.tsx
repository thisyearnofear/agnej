'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion'

export default function ImmersiveBackground({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const { scrollY } = useScroll()
  const y1 = useTransform(scrollY, [0, 1000], [0, 200])
  const y2 = useTransform(scrollY, [0, 1000], [0, -150])
  const y3 = useTransform(scrollY, [0, 1000], [0, 100])

  // Mouse position for parallax
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  
  useEffect(() => {
    setMounted(true)
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2
      const y = (e.clientY / window.innerHeight - 0.5) * 2
      mouseX.set(x)
      mouseY.set(y)
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('resize', checkMobile)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [mouseX, mouseY])

  // Animated particles
  const particles = useMemo(() => {
    if (!mounted) return []
    const count = isMobile ? 15 : 30
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.5 + 0.1,
    }))
  }, [isMobile, mounted])

  // Grid lines for depth
  const gridLines = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      delay: i * 0.5,
    }))
  }, [])

  // Floating orbs with enhanced effects
  const orbs = useMemo(() => {
    if (!mounted) return []
    const count = isMobile ? 3 : 5
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      size: Math.random() * 300 + 200,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2,
      duration: Math.random() * 15 + 20,
      color: i === 0 ? 'from-blue-600/20 to-purple-600/10' :
        i === 1 ? 'from-purple-600/20 to-pink-600/10' :
        i === 2 ? 'from-cyan-600/20 to-blue-600/10' :
        'from-indigo-600/20 to-purple-600/10'
    }))
  }, [isMobile, mounted])

  const orbX1 = useTransform(mouseX, [-1, 1], [30, -30])
  const orbY1 = useTransform(mouseY, [-1, 1], [30, -30])
  const orbX2 = useTransform(mouseX, [-1, 1], [-20, 20])
  const orbY2 = useTransform(mouseY, [-1, 1], [-20, 20])

  return (
    <div ref={containerRef} className="relative min-h-screen w-full bg-slate-950 overflow-x-hidden">
      {/* Fixed Background Layer */}
      <div className="fixed inset-0 -z-50 pointer-events-none select-none overflow-hidden">
        
        {/* Animated Grid Background */}
        <motion.div 
          className="absolute inset-0 opacity-[0.03]"
          style={{ y: y1 }}
        >
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-blue-500" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </motion.div>

        {/* Perspective Grid (angled) */}
        <motion.div 
          className="absolute inset-0 opacity-[0.02]"
          style={{ y: y2 }}
        >
          <div 
            className="w-[200%] h-[200%] -left-[50%] -top-[50%]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)
              `,
              backgroundSize: '100px 100px',
              transform: 'perspective(500px) rotateX(60deg)',
              transformOrigin: 'center bottom'
            }}
          />
        </motion.div>

        {/* Floating Blurred Orbs with Mouse Parallax */}
        <div className="absolute inset-0">
          {mounted && orbs.map((orb) => (
            <motion.div
              key={orb.id}
              className={`absolute rounded-full bg-gradient-to-br ${orb.color} blur-[100px] md:blur-[150px]`}
              style={{
                width: orb.size,
                height: orb.size,
                left: `${orb.x}%`,
                top: `${orb.y}%`,
                x: orb.id === 0 ? orbX1 : orb.id === 1 ? orbX2 : 0,
                y: orb.id === 0 ? orbY1 : orb.id === 1 ? orbY2 : 0,
              }}
              animate={{
                opacity: [0.15, 0.35, 0.15],
                scale: [1, 1.15, 1],
              }}
              transition={{
                delay: orb.delay,
                duration: orb.duration,
                ease: 'easeInOut' as const,
                repeat: Infinity,
                repeatType: 'reverse',
              }}
            />
          ))}
        </div>

        {/* Particle System */}
        <div className="absolute inset-0 overflow-hidden">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute rounded-full bg-blue-400"
              style={{
                width: particle.size,
                height: particle.size,
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                opacity: particle.opacity,
              }}
              animate={{
                y: [0, -100, 0],
                x: [0, Math.random() * 30 - 15, 0],
                opacity: [particle.opacity, particle.opacity * 0.5, particle.opacity],
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                ease: 'easeInOut',
                repeat: Infinity,
              }}
            />
          ))}
        </div>

        {/* Animated Scan Lines */}
        <div className="absolute inset-0 opacity-20">
          {gridLines.map((line) => (
            <motion.div
              key={line.id}
              className="absolute h-px w-full bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"
              style={{
                top: `${line.id * 12.5}%`,
              }}
              animate={{
                x: ['-100%', '100%'],
                opacity: [0, 0.5, 0],
              }}
              transition={{
                duration: 3,
                delay: line.delay,
                repeat: Infinity,
                repeatDelay: 5,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        {/* Radial Gradient Overlay */}
        <div className="absolute inset-0 bg-radial-gradient opacity-30" style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(15, 23, 42, 0.8) 100%)'
        }} />
        
        {/* Bottom Fade */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
        
        {/* Top Fade */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-slate-950 to-transparent" />
      </div>

      {/* Main Content (Scrollable) */}
      <div className="relative z-10 w-full flex flex-col items-center">
        {children}
      </div>
    </div>
  )
}
'use client'

import React, { useEffect, useRef, useState } from 'react'

export default function InteractiveTower() {
  const [isMobile, setIsMobile] = useState(false)
  const [hoveredBlock, setHoveredBlock] = useState<number | null>(null)
  const [isInteracting, setIsInteracting] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  })

  // Enhanced 2D/3D hybrid tower animation
  useEffect(() => {
    if (!canvasRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    let animationFrameId: number
    let blocks: Array<{
      x: number, y: number, width: number, height: number, 
      color: string, depth: number, angle: number
    }> = []
    
    // Initialize blocks with 3D perspective
    const initBlocks = () => {
      blocks = []
      const blockWidth = 60
      const blockHeight = 20
      const blockDepth = 15
      const layers = 12
      
      for (let i = 0; i < layers; i++) {
        const isEvenLayer = i % 2 === 0
        const offsetX = isEvenLayer ? 0 : blockWidth / 2
        const perspectiveScale = 1 - (i * 0.02) // Simulate depth
        
        for (let j = 0; j < 3; j++) {
          blocks.push({
            x: offsetX + j * blockWidth,
            y: canvas.height - (i + 1) * blockHeight,
            width: blockWidth * perspectiveScale,
            height: blockHeight * perspectiveScale,
            depth: blockDepth * perspectiveScale,
            color: i < layers - 2 ? '#4F46E5' : '#EF4444',
            angle: 0
          })
        }
      }
    }
    
    const drawBlocks = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw background gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, 'rgba(30, 41, 59, 0.8)')
      gradient.addColorStop(1, 'rgba(17, 24, 39, 0.8)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Sort blocks by y position for proper depth rendering
      const sortedBlocks = [...blocks].sort((a, b) => a.y - b.y)
      
      sortedBlocks.forEach((block, index) => {
        // Add physics-based wobble when interacting
        const wobbleAmount = isInteracting ? Math.sin(Date.now() * 0.005 + index * 0.3) * 3 : Math.sin(Date.now() * 0.002 + index * 0.5) * 0.5
        const currentColor = hoveredBlock === index ? '#8B5CF6' : block.color
        
        // Draw main block
        ctx.fillStyle = currentColor
        ctx.strokeStyle = hoveredBlock === index ? '#A78BFA' : '#374151'
        ctx.lineWidth = hoveredBlock === index ? 3 : 2
        
        // Apply 3D perspective transform
        ctx.save()
        ctx.translate(block.x + wobbleAmount + block.width / 2, block.y + block.height / 2)
        ctx.rotate(block.angle * Math.PI / 180)
        
        // Draw block with rounded corners
        ctx.beginPath()
        ctx.roundRect(
          -block.width / 2,
          -block.height / 2,
          block.width,
          block.height,
          4
        )
        ctx.fill()
        ctx.stroke()
        
        // Add 3D side effect
        ctx.fillStyle = hoveredBlock === index ? 'rgba(139, 92, 246, 0.3)' : 'rgba(79, 70, 229, 0.2)'
        ctx.beginPath()
        ctx.moveTo(block.width / 2, -block.height / 2)
        ctx.lineTo(block.width / 2 + block.depth / 2, -block.height / 2 - block.depth / 4)
        ctx.lineTo(block.width / 2 + block.depth / 2, block.height / 2 - block.depth / 4)
        ctx.lineTo(block.width / 2, block.height / 2)
        ctx.closePath()
        ctx.fill()
        
        ctx.restore()
        
        // Add shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
        ctx.shadowBlur = 8
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 4
      })
      
      // Add some floating particles for atmosphere
      if (Math.random() > 0.7) {
        ctx.fillStyle = 'rgba(147, 197, 253, 0.6)'
        ctx.beginPath()
        ctx.arc(
          Math.random() * canvas.width,
          Math.random() * canvas.height,
          Math.random() * 2 + 1,
          0,
          Math.PI * 2
        )
        ctx.fill()
      }
    }
    
    const animate = () => {
      drawBlocks()
      animationFrameId = requestAnimationFrame(animate)
    }
    
    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    initBlocks()
    animate()
    
    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [hoveredBlock, isInteracting])

  const handleClick = (e: React.MouseEvent) => {
    if (!canvasRef.current) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Find clicked block
    const blockIndex = Math.floor((x / rect.width) * 36)
    setHoveredBlock(blockIndex)
    setIsInteracting(true)
    
    // Reset interaction after animation
    setTimeout(() => setIsInteracting(false), 1000)
  }

  return (
    <div className="relative w-full max-w-2xl h-96 mx-auto">
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-lg shadow-2xl shadow-blue-900/50 cursor-pointer"
        onMouseMove={(e) => {
          if (!canvasRef.current || isMobile) return
          const rect = canvasRef.current.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          
          const blockIndex = Math.floor((x / rect.width) * 36)
          setHoveredBlock(blockIndex)
        }}
        onMouseLeave={() => setHoveredBlock(null)}
        onClick={handleClick}
      />
      
      {!isMobile && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-400 animate-pulse">
            <p className="mb-1">👆 Hover & click blocks!</p>
            <p className="text-xs">Experience the physics</p>
          </div>
        </div>
      )}
    </div>
  )
}
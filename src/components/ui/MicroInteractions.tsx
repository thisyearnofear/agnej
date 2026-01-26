'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function ButtonWithFeedback({
  children,
  onClick,
  disabled = false,
  type = 'primary',
  size = 'medium',
  className = ''
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  type?: 'primary' | 'secondary' | 'danger' | 'success'
  size?: 'small' | 'medium' | 'large'
  className?: string
}) {
  
  const typeClasses = {
    primary: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500',
    secondary: 'bg-white/5 hover:bg-white/10 border border-white/10',
    danger: 'bg-red-600 hover:bg-red-500',
    success: 'bg-green-600 hover:bg-green-500'
  }
  
  const sizeClasses = {
    small: 'px-3 py-1 text-sm',
    medium: 'px-4 py-2',
    large: 'px-6 py-3 text-lg'
  }
  
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={`font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${typeClasses[type]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </motion.button>
  )
}

export function LoadingSpinner({ size = 24, color = 'white' }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className="inline-block"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2C17.5228 2 22 6.47715 22 12"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </motion.div>
  )
}

export function HoverCard({
  children,
  hoverContent,
  className = ''
}: {
  children: React.ReactNode
  hoverContent: React.ReactNode
  className?: string
}) {
  const [isHovered, setIsHovered] = React.useState(false)
  
  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-10 mt-2 p-3 bg-gray-900 border border-white/20 rounded-lg shadow-lg text-sm text-gray-300"
          >
            {hoverContent}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function StatusIndicator({
  status,
  className = ''
}: {
  status: 'success' | 'warning' | 'error' | 'info'
  className?: string
}) {
  
  const statusConfig = {
    success: { color: 'bg-green-500', icon: '✓', text: 'Success' },
    warning: { color: 'bg-yellow-500', icon: '⚠️', text: 'Warning' },
    error: { color: 'bg-red-500', icon: '✕', text: 'Error' },
    info: { color: 'bg-blue-500', icon: 'ℹ️', text: 'Info' }
  }
  
  const config = statusConfig[status]
  
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm font-semibold ${config.color} ${className}`}
    >
      <span>{config.icon}</span>
      <span>{config.text}</span>
    </motion.div>
  )
}

export function AnimatedCounter({
  value,
  duration = 1,
  className = ''
}: {
  value: number
  duration?: number
  className?: string
}) {
  const [displayValue, setDisplayValue] = React.useState(0)
  
  React.useEffect(() => {
    const controls = { value: 0 }
    
    // Simple animation logic
    const startTime = performance.now()
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / (duration * 1000), 1)
      const currentValue = Math.floor(controls.value + (value - controls.value) * progress)
      
      setDisplayValue(currentValue)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }, [value, duration])
  
  return <span className={className}>{displayValue}</span>
}
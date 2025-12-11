'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface EnhancedModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showCloseButton?: boolean
  closeButtonType?: 'emoji' | 'svg' | 'text'
}

export default function EnhancedModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  showCloseButton = true,
  closeButtonType = 'svg'
}: EnhancedModalProps) {
  
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  }
  
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: -10 }
  }
  
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  }
  
  const getCloseButton = () => {
    switch (closeButtonType) {
      case 'emoji':
        return (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl font-bold"
            aria-label="Close modal"
          >
            ✕
          </button>
        )
      case 'text':
        return (
          <button
            onClick={onClose}
            className="bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-1 rounded-lg transition-colors text-sm font-semibold"
            aria-label="Close modal"
          >
            Close
          </button>
        )
      default: // svg
        return (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )
    }
  }
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={overlayVariants}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={modalVariants}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20 p-6 rounded-2xl w-full ${sizeClasses[size]} shadow-2xl max-h-[90vh] flex flex-col`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header with consistent styling */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">{title}</h2>
                {subtitle && (
                  <p className="text-gray-400 text-sm hidden md:block">{subtitle}</p>
                )}
              </div>
              {showCloseButton && getCloseButton()}
            </div>

            {/* Content area with scroll */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
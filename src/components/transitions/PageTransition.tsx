'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PageTransitionProps {
  children: React.ReactNode
  key?: string
  transitionType?: 'fade' | 'slide' | 'scale' | 'flip'
  duration?: number
}

export default function PageTransition({
  children,
  key = 'page',
  transitionType = 'fade',
  duration = 0.3
}: PageTransitionProps) {
  
  const getVariants = () => {
    switch (transitionType) {
      case 'slide':
        return {
          initial: { opacity: 0, x: '100%' },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: '-100%' }
        }
      case 'scale':
        return {
          initial: { opacity: 0, scale: 0.8 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 1.2 }
        }
      case 'flip':
        return {
          initial: { opacity: 0, rotateY: 180 },
          animate: { opacity: 1, rotateY: 0 },
          exit: { opacity: 0, rotateY: -180 }
        }
      case 'scan':
        return {
          initial: { opacity: 0, y: '100%', scale: 0.9 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: '-100%', scale: 1.1 }
        }
      default: // fade
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 }
        }
    }
  }
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={getVariants()}
        transition={{ duration, ease: 'easeInOut' }}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
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
          initial: { opacity: 0, x: 20 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -20 }
        }
      case 'scale':
        return {
          initial: { opacity: 0, scale: 0.95 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.95 }
        }
      case 'flip':
        return {
          initial: { opacity: 0, rotateY: 15 },
          animate: { opacity: 1, rotateY: 0 },
          exit: { opacity: 0, rotateY: -15 }
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
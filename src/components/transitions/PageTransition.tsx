'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PageTransitionProps {
  children: React.ReactNode
  transitionType?: 'fade' | 'slide' | 'scale' | 'flip' | 'scan'
  duration?: number
}

export default function PageTransition({
  children,
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
          initial: { opacity: 0, y: 20, scale: 0.98 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: -20, scale: 1.02 }
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
        initial="initial"
        animate="animate"
        exit="exit"
        variants={getVariants()}
        transition={{ duration, ease: 'easeInOut' }}
        className="w-full min-h-screen"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
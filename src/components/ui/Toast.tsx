'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { ToastMessage } from '@/hooks/useToast'

interface ToastContainerProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

const typeStyles: Record<ToastMessage['type'], string> = {
  success: 'bg-green-600/90 border-green-400/50',
  warning: 'bg-yellow-600/90 border-yellow-400/50',
  error: 'bg-red-600/90 border-red-400/50',
  info: 'bg-blue-600/90 border-blue-400/50',
}

const typeIcons: Record<ToastMessage['type'], string> = {
  success: '✓',
  warning: '⚠',
  error: '✕',
  info: 'ℹ',
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col-reverse gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`${typeStyles[toast.type]} backdrop-blur-md border rounded-xl px-4 py-3 text-white text-sm font-medium shadow-lg flex items-center gap-3 pointer-events-auto cursor-pointer min-w-[200px]`}
            onClick={() => onDismiss(toast.id)}
          >
            <span className="text-base flex-shrink-0">{typeIcons[toast.type]}</span>
            <span>{toast.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

'use client'

import { useToastStore, type ToastType } from '@/stores/toast-store'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertTriangle, Info, Loader2, X } from 'lucide-react'

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-gaming-green" />,
  error: <XCircle className="h-5 w-5 text-gaming-red" />,
  warning: <AlertTriangle className="h-5 w-5 text-gaming-yellow" />,
  info: <Info className="h-5 w-5 text-gaming-blue" />,
  loading: <Loader2 className="h-5 w-5 text-gaming-purple animate-spin" />,
}

const bgColors: Record<ToastType, string> = {
  success: 'border-gaming-green/30 bg-gaming-green/10',
  error: 'border-gaming-red/30 bg-gaming-red/10',
  warning: 'border-gaming-yellow/30 bg-gaming-yellow/10',
  info: 'border-gaming-blue/30 bg-gaming-blue/10',
  loading: 'border-gaming-purple/30 bg-gaming-purple/10',
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`flex items-start gap-3 rounded-lg border p-4 shadow-2xl backdrop-blur-md ${bgColors[toast.type]}`}
          >
            <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{toast.title}</p>
              {toast.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{toast.description}</p>
              )}
            </div>
            {toast.type !== 'loading' && (
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

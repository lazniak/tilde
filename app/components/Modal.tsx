'use client'

import React, { useEffect } from 'react'
import { motion } from 'framer-motion'

interface ModalProps {
  onClose?: () => void
  accent?: 'flare' | 'prismatic' | 'stratosphere' | 'bunker'
  children: React.ReactNode
  /** Tailwind max-width class */
  width?: string
  locked?: boolean
}

const BORDER: Record<NonNullable<ModalProps['accent']>, string> = {
  flare: 'border-flare/40',
  prismatic: 'border-prismatic/40',
  stratosphere: 'border-stratosphere/40',
  bunker: 'border-bunker/40',
}

/** Full-screen modal with backdrop; closes on backdrop tap / Escape unless `locked`. */
export function Modal({ onClose, accent = 'bunker', children, width = 'max-w-2xl', locked }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !locked) onClose?.()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, locked])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-void/95 backdrop-blur flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={() => !locked && onClose?.()}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        className={`${width} w-full max-h-[88dvh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6 border ${BORDER[accent]} bg-void`}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

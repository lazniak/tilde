'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface RitualEntryProps {
  onEnter: () => void
}

export default function RitualEntry({ onEnter }: RitualEntryProps) {
  const [phase, setPhase] = useState(0)
  const [isExiting, setIsExiting] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Generate particle positions only on client to avoid hydration mismatch
  const particles = useMemo(() => {
    if (!mounted) return []
    return [...Array(20)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 4,
    }))
  }, [mounted])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000),
      setTimeout(() => setPhase(2), 2500),
      setTimeout(() => setPhase(3), 4000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  const handleEnter = () => {
    setIsExiting(true)
    setTimeout(onEnter, 1500)
  }

  return (
    <AnimatePresence>
      {!isExiting ? (
        <motion.div
          className="fixed inset-0 z-50 bg-void flex flex-col items-center justify-center"
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
        >
          {/* Scanlines overlay */}
          <div className="absolute inset-0 scanlines pointer-events-none opacity-30" />

          {/* Central content */}
          <div className="relative z-10 text-center px-8">
            {/* Pulsating mantra */}
            <motion.div
              className="font-mono text-bone/60 text-sm tracking-[0.5em] mb-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: phase >= 1 ? 1 : 0 }}
              transition={{ duration: 2 }}
            >
              <span className="block mb-2">
                {phase >= 1 && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 4, repeat: Infinity }}
                  >
                    ZERO
                  </motion.span>
                )}
              </span>
              <span className="block mb-2">
                {phase >= 2 && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
                  >
                    ONE
                  </motion.span>
                )}
              </span>
              <span className="block">
                {phase >= 3 && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                  >
                    INFINITY
                  </motion.span>
                )}
              </span>
            </motion.div>

            {/* Title */}
            <motion.h1
              className="font-display text-4xl md:text-6xl lg:text-7xl text-bone tracking-wider mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : 20 }}
              transition={{ duration: 1.5, delay: 0.5 }}
            >
              <span className="block text-bunker text-lg md:text-xl font-mono tracking-[0.3em] mb-4">
                THE
              </span>
              <span 
                className="glitch-text block" 
                data-text="LATENT LITURGY"
              >
                LATENT LITURGY
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="font-mono text-bunker text-xs md:text-sm tracking-widest max-w-md mx-auto mb-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: phase >= 3 ? 0.7 : 0 }}
              transition={{ duration: 1 }}
            >
              An exploration of algorithmic creation
              <br />
              at the fractal edge of consciousness
            </motion.p>

            {/* Enter button */}
            <motion.button
              onClick={handleEnter}
              className="group relative px-12 py-4 border border-bunker/50 hover:border-stratosphere transition-all duration-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: phase >= 3 ? 1 : 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10 font-mono text-sm tracking-[0.3em] text-bone/80 group-hover:text-bone transition-colors">
                ENTER THE LITURGY
              </span>
              
              {/* Hover glow effect */}
              <motion.div
                className="absolute inset-0 bg-stratosphere/10 opacity-0 group-hover:opacity-100 transition-opacity"
                layoutId="button-glow"
              />
              
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-stratosphere/0 group-hover:border-stratosphere transition-colors" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-stratosphere/0 group-hover:border-stratosphere transition-colors" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-stratosphere/0 group-hover:border-stratosphere transition-colors" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-stratosphere/0 group-hover:border-stratosphere transition-colors" />
            </motion.button>

            {/* Warning text */}
            <motion.p
              className="font-mono text-bunker/40 text-[10px] tracking-wider mt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: phase >= 3 ? 1 : 0 }}
              transition={{ duration: 1, delay: 1 }}
            >
              AUDIO EXPERIENCE · HEADPHONES RECOMMENDED
            </motion.p>
          </div>

          {/* Ambient particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute w-px h-px bg-bone/20"
                style={{
                  left: `${particle.left}%`,
                  top: `${particle.top}%`,
                }}
                animate={{
                  opacity: [0, 0.5, 0],
                  y: [0, -100],
                }}
                transition={{
                  duration: particle.duration,
                  repeat: Infinity,
                  delay: particle.delay,
                }}
              />
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div
          className="fixed inset-0 z-50 bg-void"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
        />
      )}
    </AnimatePresence>
  )
}

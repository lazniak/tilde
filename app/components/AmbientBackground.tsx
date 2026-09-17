'use client'

import { motion } from 'framer-motion'
import { useLiturgy, type Screen } from '@/app/lib/LiturgyContext'
import { backgroundComponent } from '@/app/features/registry'

/** Subtle ambient background. A feature package may replace it (e.g. a WebGL shader). */
export function AmbientBackground({ screenKey }: { screenKey: Screen }) {
  const { bgImages } = useLiturgy()
  const Custom = backgroundComponent()
  if (Custom) return <Custom />

  const isGenesis = screenKey === 'genesis'
  return (
    <div className="fixed inset-0 pointer-events-none z-0" aria-hidden>
      <motion.div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: bgImages[screenKey] ? `url(${bgImages[screenKey]})` : undefined }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isGenesis ? 0.03 : 0.05 }}
        transition={{ duration: 2 }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: isGenesis
            ? 'linear-gradient(to bottom, rgba(10,10,12,0.5), rgba(10,10,12,0.3), rgba(10,10,12,0.6))'
            : 'linear-gradient(to bottom, rgba(10,10,12,0.8), rgba(10,10,12,0.6), rgba(10,10,12,0.9))',
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse at center, transparent 0%, rgba(10,10,12,${isGenesis ? 0.4 : 0.6}) 100%)` }}
      />
    </div>
  )
}

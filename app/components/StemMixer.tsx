'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { STEMS, ASSEMBLAGE_STAGES } from '@/app/lib/constants'
import { getAudioEngine, type StemId, type AssemblageStage } from '@/app/lib/audioEngine'

interface StemMixerProps {
  isPlaying: boolean
  currentStage: AssemblageStage
  currentTime: number
  onTogglePlay: () => void
}

export default function StemMixer({ isPlaying, currentStage, currentTime, onTogglePlay }: StemMixerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [stemVolumes, setStemVolumes] = useState<Record<StemId, number>>({} as Record<StemId, number>)
  const [activeLayers, setActiveLayers] = useState<number[]>([1])
  const [loadedCount, setLoadedCount] = useState(0)

  useEffect(() => {
    const initial: Record<StemId, number> = {} as Record<StemId, number>
    STEMS.forEach(s => { initial[s.id] = 1 })
    setStemVolumes(initial)
  }, [])

  useEffect(() => {
    setActiveLayers([...ASSEMBLAGE_STAGES[currentStage].layers])
  }, [currentStage])

  useEffect(() => {
    const engine = getAudioEngine()
    if (engine.isInitialized()) {
      setLoadedCount(engine.getLoadedStemsCount())
    }
  }, [isPlaying])

  const handleVolumeChange = (stemId: StemId, value: number) => {
    setStemVolumes(prev => ({ ...prev, [stemId]: value }))
    const engine = getAudioEngine()
    engine.setStemVolume(stemId, value)
  }

  const isStemActive = (stem: typeof STEMS[number]) => {
    return activeLayers.includes(stem.layer)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {/* Toggle button */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute bottom-0 right-0 w-14 h-14 bg-void border border-bunker/30 hover:border-stratosphere/50 flex items-center justify-center transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="flex items-end justify-center gap-0.5 h-6">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 bg-bone/60"
              animate={isPlaying ? {
                height: [4, 12 + Math.random() * 12, 4],
              } : { height: 4 }}
              transition={{
                duration: 0.4,
                repeat: isPlaying ? Infinity : 0,
                delay: i * 0.1,
              }}
            />
          ))}
        </div>
      </motion.button>

      {/* Expanded mixer panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-20 right-0 w-80 bg-void/95 backdrop-blur-sm border border-bunker/30 p-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-mono text-[10px] text-bunker/60 tracking-wider">
                  SYNCHRONIZED STEMS ({loadedCount}/{STEMS.length})
                </div>
                <div className="font-mono text-xs text-bone/80">
                  {ASSEMBLAGE_STAGES[currentStage].label}
                </div>
              </div>
              <button
                onClick={onTogglePlay}
                className={`px-4 py-2 border transition-colors ${
                  isPlaying 
                    ? 'border-flare/50 bg-flare/10 text-flare' 
                    : 'border-stratosphere/50 bg-stratosphere/10 text-stratosphere'
                }`}
              >
                <span className="font-mono text-xs">
                  {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
                </span>
              </button>
            </div>

            {/* Time display */}
            <div className="mb-4 p-2 bg-void border border-bunker/20">
              <div className="font-mono text-lg text-prismatic text-center">
                {formatTime(currentTime)}
              </div>
              <div className="mt-1 h-1 bg-bunker/20 rounded">
                <motion.div 
                  className="h-full bg-stratosphere/60 rounded"
                  style={{ width: `${(currentTime / 320) * 100}%` }}
                />
              </div>
            </div>

            {/* Stem sliders */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {STEMS.map((stem) => {
                const isActive = isStemActive(stem)
                return (
                  <div 
                    key={stem.id}
                    className={`p-2 border transition-all ${
                      isActive 
                        ? 'border-stratosphere/30 bg-stratosphere/5' 
                        : 'border-bunker/10 opacity-40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <motion.div 
                          className={`w-2 h-2 rounded-full ${
                            isActive ? 'bg-stratosphere' : 'bg-bunker/50'
                          }`}
                          animate={isActive && isPlaying ? {
                            scale: [1, 1.3, 1],
                            opacity: [0.7, 1, 0.7],
                          } : {}}
                          transition={{ duration: 0.5, repeat: Infinity }}
                        />
                        <span className="font-mono text-[11px] text-bone/80">
                          {stem.name}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-bunker/50">
                        Layer {stem.layer}
                      </span>
                    </div>
                    <div className="relative h-2 bg-bunker/20 rounded">
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-stratosphere/60 rounded"
                        style={{ width: `${(stemVolumes[stem.id] || 1) * 100}%` }}
                        animate={isPlaying && isActive ? {
                          opacity: [0.6, 1, 0.6],
                        } : { opacity: 0.6 }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={stemVolumes[stem.id] || 1}
                        onChange={(e) => handleVolumeChange(stem.id, parseFloat(e.target.value))}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Stage progression */}
            <div className="mt-4 pt-4 border-t border-bunker/20">
              <div className="font-mono text-[10px] text-bunker/50 mb-2">
                ASSEMBLAGE PROGRESSION
              </div>
              <div className="flex gap-1">
                {Object.entries(ASSEMBLAGE_STAGES).map(([stage, data]) => (
                  <div
                    key={stage}
                    className={`flex-1 h-2 rounded-sm transition-colors ${
                      stage === currentStage 
                        ? 'bg-prismatic' 
                        : data.layers.every(l => activeLayers.includes(l))
                          ? 'bg-stratosphere/60'
                          : 'bg-bunker/30'
                    }`}
                    title={data.label}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1">
                <span className="font-mono text-[8px] text-bunker/40">Entry</span>
                <span className="font-mono text-[8px] text-bunker/40">Culmination</span>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center font-mono text-sm text-bunker hover:text-bone transition-colors"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

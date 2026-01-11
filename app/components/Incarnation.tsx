'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DRAMATURGY } from '@/app/lib/constants'

interface IncarnationProps {
  isActive: boolean
  currentTime: number
  onVideoTimeUpdate?: (time: number) => void
}

interface VideoClip {
  index: number
  file: string
  timeRange: string
  description: string
}

// Generate video clip data
const generateVideoClips = (): VideoClip[] => {
  const clips: VideoClip[] = []
  for (let i = 0; i <= 70; i++) {
    // Skip missing indices
    if (i === 21 || i === 50 || i === 54) continue
    const paddedIndex = i.toString().padStart(3, '0')
    clips.push({
      index: i,
      file: `eon_${paddedIndex}.mp4`,
      timeRange: `${(i * 4.5).toFixed(1)}s - ${((i + 1) * 4.5).toFixed(1)}s`,
      description: `Scene ${i}: Visual manifestation segment`,
    })
  }
  return clips
}

const VIDEO_CLIPS = generateVideoClips()

export default function Incarnation({ isActive, currentTime }: IncarnationProps) {
  const [currentClipIndex, setCurrentClipIndex] = useState(0)
  const [isGlitching, setIsGlitching] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [selectedClip, setSelectedClip] = useState<VideoClip | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Determine current dramaturgy phase
  const getCurrentPhase = useCallback(() => {
    for (let i = DRAMATURGY.length - 1; i >= 0; i--) {
      if (currentTime >= DRAMATURGY[i].time) {
        return DRAMATURGY[i]
      }
    }
    return DRAMATURGY[0]
  }, [currentTime])

  const currentPhase = getCurrentPhase()

  // Trigger glitch effect at high intensity moments
  useEffect(() => {
    if (currentPhase.intensity >= 8) {
      setIsGlitching(true)
      const timer = setTimeout(() => setIsGlitching(false), 300)
      return () => clearTimeout(timer)
    }
  }, [currentPhase])

  // Auto-advance clips based on time
  useEffect(() => {
    const clipIndex = Math.floor(currentTime / 4.5) % VIDEO_CLIPS.length
    if (clipIndex !== currentClipIndex && clipIndex < VIDEO_CLIPS.length) {
      setCurrentClipIndex(clipIndex)
    }
  }, [currentTime, currentClipIndex])

  const handleClipClick = (clip: VideoClip) => {
    setSelectedClip(clip)
    setShowPrompt(true)
  }

  const currentClip = VIDEO_CLIPS[currentClipIndex] || VIDEO_CLIPS[0]

  return (
    <div 
      ref={containerRef}
      className="h-full flex flex-col bg-void relative overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-bunker/20 relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-flare animate-pulse" />
              <span className="font-mono text-xs text-bunker tracking-widest">II. INCARNATION</span>
            </div>
            <h2 className="font-display text-xl text-bone/90 italic">The Avatar</h2>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] text-bunker/60">
              {currentPhase.event}
            </div>
            <div className="font-mono text-xs text-flare">
              intensity: {currentPhase.intensity}/10
            </div>
          </div>
        </div>
      </div>

      {/* Main video display */}
      <div className="flex-1 relative">
        {/* Video container with glitch effect */}
        <motion.div
          className={`absolute inset-0 ${isGlitching ? 'animate-glitch' : ''}`}
          animate={isGlitching ? {
            x: [0, -5, 5, -3, 3, 0],
            filter: ['hue-rotate(0deg)', 'hue-rotate(90deg)', 'hue-rotate(-90deg)', 'hue-rotate(0deg)'],
          } : {}}
          transition={{ duration: 0.3 }}
        >
          {/* Static image fallback / main visual */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(/eon/asset_Woman_The_Medium.png)`,
              filter: isGlitching ? 'saturate(2) contrast(1.2)' : 'saturate(0.8)',
            }}
          />

          {/* Video overlay */}
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-screen"
            src={`/eon/${currentClip.file}`}
            autoPlay
            muted
            loop
            playsInline
          />

          {/* Scanlines */}
          <div className="absolute inset-0 scanlines opacity-20 pointer-events-none" />

          {/* Gradient overlay */}
          <div className="absolute inset-0 video-overlay pointer-events-none" />

          {/* Fractal border effect during high intensity */}
          {currentPhase.intensity >= 7 && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              animate={{
                boxShadow: [
                  'inset 0 0 30px rgba(217, 108, 44, 0.3)',
                  'inset 0 0 60px rgba(217, 108, 44, 0.5)',
                  'inset 0 0 30px rgba(217, 108, 44, 0.3)',
                ],
              }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          )}
        </motion.div>

        {/* Current clip info */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <motion.div
            className="p-3 bg-void/80 backdrop-blur-sm border border-bunker/30 cursor-pointer hover:border-stratosphere/50 transition-colors"
            onClick={() => handleClipClick(currentClip)}
            whileHover={{ scale: 1.01 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-[10px] text-bunker/60">
                  NOW PLAYING
                </div>
                <div className="font-mono text-xs text-bone/80">
                  {currentClip.file}
                </div>
              </div>
              <div className="font-mono text-[10px] text-stratosphere">
                {currentClip.timeRange}
              </div>
            </div>
            <div className="font-mono text-[10px] text-bone/40 mt-1">
              Click to view generation prompt →
            </div>
          </motion.div>
        </div>
      </div>

      {/* Clip timeline strip */}
      <div className="h-16 border-t border-bunker/20 bg-void/80 overflow-x-auto">
        <div className="flex h-full items-center px-2 gap-1">
          {VIDEO_CLIPS.slice(0, 20).map((clip, i) => (
            <motion.div
              key={clip.index}
              className={`flex-shrink-0 w-12 h-10 border cursor-pointer transition-all ${
                i === currentClipIndex 
                  ? 'border-flare bg-flare/20' 
                  : 'border-bunker/30 hover:border-stratosphere/50 bg-void'
              }`}
              onClick={() => {
                setCurrentClipIndex(i)
                handleClipClick(clip)
              }}
              whileHover={{ scale: 1.1 }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <span className="font-mono text-[8px] text-bone/60">
                  {clip.index.toString().padStart(3, '0')}
                </span>
              </div>
            </motion.div>
          ))}
          <div className="font-mono text-[10px] text-bunker/40 px-2">
            +{VIDEO_CLIPS.length - 20} more
          </div>
        </div>
      </div>

      {/* Prompt modal */}
      <AnimatePresence>
        {showPrompt && selectedClip && (
          <motion.div
            className="absolute inset-0 z-20 bg-void/95 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPrompt(false)}
          >
            <motion.div
              className="max-w-lg w-full p-6 border border-bunker/30"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="font-mono text-xs text-stratosphere">
                  {selectedClip.file}
                </div>
                <button
                  className="font-mono text-xs text-bunker hover:text-bone transition-colors"
                  onClick={() => setShowPrompt(false)}
                >
                  [CLOSE]
                </button>
              </div>
              
              <div className="font-mono text-[10px] text-bunker/60 mb-2">
                // stage7_prompts.json → scene_{selectedClip.index}
              </div>
              
              <div className="p-3 bg-void border border-bunker/20">
                <p className="font-mono text-xs text-bone/70 leading-relaxed">
                  Cinematic shot capturing the essence of transformation. 
                  Woman_The_Medium exists in the liminal space between states, 
                  her form dissolving at the fractal edges of perception. 
                  The lighting creates harsh chiaroscuro, solar flares bleeding 
                  into the void. Shot on 35mm film with high contrast grain.
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-bunker/20">
                <div className="font-mono text-[10px] text-bunker/50">
                  ASSETS: Woman_The_Medium, Salt_Flat_Desert, Prop_Prism_Lens
                </div>
                <div className="font-mono text-[10px] text-bunker/50">
                  MODEL: kwaivgi/kling-v2.6
                </div>
                <div className="font-mono text-[10px] text-bunker/50">
                  GENERATED: 08.01.2026 11:{(40 + selectedClip.index % 20).toString().padStart(2, '0')}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

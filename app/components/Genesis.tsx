'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { PAUL_PROMPT, KEYWORDS, NARRATIVE_EXCERPT } from '@/app/lib/constants'

interface GenesisProps {
  isActive: boolean
  currentTime: number
}

export default function Genesis({ isActive, currentTime }: GenesisProps) {
  const [hoveredWord, setHoveredWord] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll based on audio time
  useEffect(() => {
    if (scrollRef.current && isActive) {
      const maxScroll = scrollRef.current.scrollHeight - scrollRef.current.clientHeight
      const scrollPosition = (currentTime / 320) * maxScroll // 320s total duration
      scrollRef.current.scrollTop = scrollPosition * 0.3 // Slow scroll
    }
  }, [currentTime, isActive])

  // Highlight keywords in text
  const renderTextWithKeywords = (text: string) => {
    const words = text.split(/(\s+)/)
    return words.map((word, index) => {
      const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '')
      const isKeyword = KEYWORDS.some(k => cleanWord.includes(k.toLowerCase()))
      
      if (isKeyword && word.trim()) {
        return (
          <motion.span
            key={index}
            className="relative cursor-pointer text-stratosphere hover:text-prismatic transition-colors"
            onMouseEnter={() => setHoveredWord(cleanWord)}
            onMouseLeave={() => setHoveredWord(null)}
            animate={{
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
            }}
          >
            {word}
          </motion.span>
        )
      }
      return <span key={index}>{word}</span>
    })
  }

  const getKeywordContext = (word: string): string => {
    const contexts: Record<string, string> = {
      tangent: '// stage1_analysis.txt\n"The divergence of the tangent function — a vector jump between minus and plus"',
      fractal: '// stage3_narrative.json\n"Fraktalny wzór pękł na krawędzi szkła"\n// Fractal pattern shattered at the edge of glass',
      picosecond: '// genesis_prompt\n"from the first picoseconds when the pattern of physicality was forming"',
      aeon: '// stage1_analysis.txt\n"the point of the aeon"\nDRAMATURGY[6].event: "Dissolution into Light"',
      vector: '// neural_weights\nlatent_space.convergence = "vector_jump"\nmanifest: asset_Woman_The_Medium.png',
      infinity: '// LYRICS_PROMPT\n"Zero. One. Infinity."\ntime_start: 21.5s',
      transformation: '// stage3_narrative.json\nassets[0].description:\n"She represents the Soul trapped in the Avatar"',
      dissolution: '// DRAMATURGY[7]\ntime: 300.0\nevent: "Dissolution into Light"\nintensity: 2',
      eruption: '// stage1_analysis.txt\nbeats[10]: { time: 245.0, strength: "strong", type: "impact-fx" }',
      consciousness: '// genesis_prompt\n"A point that is the home of collective consciousness"',
      avatar: '// LYRICS_PROMPT\n"Avatara zdejmuję z szacunkiem i drżeniem"\ntime_start: 220.5s',
      kingdom: '// genesis_prompt\n"A place that religion called the Heavenly Kingdom"',
      frequency: '// stage3_palette.json\n"at the junction of proper correlations of frequencies and energy, blasts occur"',
      latent: '// neural_architecture\nlatent_space.dimension: 1024\nconvergence_point: "The_Medium"',
    }
    return contexts[word] || '// unknown_reference\nno context available'
  }

  return (
    <div className="h-full flex flex-col bg-void/50 backdrop-blur-sm border-r border-bunker/20">
      {/* Header */}
      <div className="p-4 border-b border-bunker/20">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-stratosphere animate-pulse" />
          <span className="font-mono text-xs text-bunker tracking-widest">I. GENESIS</span>
        </div>
        <h2 className="font-display text-xl text-bone/90 italic">The Word</h2>
      </div>

      {/* Scrolling prompt text */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 matrix-scroll custom-scrollbar"
      >
        {/* Sacred text wrapper */}
        <div className="space-y-6">
          {/* Paul's original prompt */}
          <div className="relative">
            <div className="font-mono text-[10px] text-bunker/50 mb-2 tracking-wider">
              // GENESIS_PROMPT — Paul Lazniak
            </div>
            <p className="font-display text-sm md:text-base text-bone/80 leading-relaxed">
              {renderTextWithKeywords(PAUL_PROMPT)}
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 py-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-bunker/30 to-transparent" />
            <span className="font-mono text-[10px] text-bunker/40">◆</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-bunker/30 to-transparent" />
          </div>

          {/* Narrative excerpt */}
          <div className="relative">
            <div className="font-mono text-[10px] text-bunker/50 mb-2 tracking-wider">
              // stage3_narrative.json → storyline
            </div>
            <p className="font-mono text-xs text-bone/60 leading-relaxed">
              {renderTextWithKeywords(NARRATIVE_EXCERPT.storyline)}
            </p>
          </div>

          {/* Asset list */}
          <div className="mt-8 space-y-3">
            <div className="font-mono text-[10px] text-bunker/50 tracking-wider">
              // MANIFEST_ASSETS
            </div>
            {NARRATIVE_EXCERPT.assets.map((asset, i) => (
              <motion.div
                key={asset.name}
                className="p-3 border border-bunker/20 hover:border-stratosphere/50 transition-colors"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="font-mono text-xs text-stratosphere mb-1">
                  {asset.name}
                </div>
                <div className="font-mono text-[10px] text-bunker/60">
                  [{asset.category}]
                </div>
                <div className="font-mono text-[10px] text-bone/50 mt-1">
                  {asset.description}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Keyword context tooltip */}
      {hoveredWord && (
        <motion.div
          className="absolute bottom-4 left-4 right-4 p-3 bg-void border border-stratosphere/50 z-20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          <pre className="font-mono text-[10px] text-prismatic/80 whitespace-pre-wrap">
            {getKeywordContext(hoveredWord)}
          </pre>
        </motion.div>
      )}

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-void to-transparent pointer-events-none" />
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAudioEngine, type AssemblageStage, type StemId } from './lib/audioEngine'
import { ASSEMBLAGE_STAGES, PAUL_PROMPT, NARRATIVE_EXCERPT, KEYWORDS, DRAMATURGY, VIDEO_PROMPTS, STEMS } from './lib/constants'
import { getGeminiChat } from './lib/gemini'

type Screen = 'landing' | 'explore' | 'genesis' | 'incarnation' | 'exegesis'

// Background images pool for subtle ambience
const BACKGROUND_IMAGES = [
  '/eon/eon_scene_000.png',
  '/eon/eon_scene_005.png',
  '/eon/eon_scene_010.png',
  '/eon/eon_scene_016.png',
  '/eon/eon_scene_020.png',
  '/eon/eon_scene_030.png',
  '/eon/eon_scene_037.png',
  '/eon/eon_scene_042.png',
  '/eon/eon_scene_046.png',
  '/eon/eon_scene_052.png',
  '/eon/eon_scene_060.png',
  '/eon/eon_scene_067.png',
  '/eon/asset_Salt_Flat_Desert.png',
  '/eon/asset_Concrete_Bunker_Interior.png',
  '/eon/asset_Salt_Lake_Shallows.png',
]

// Video clips data
const VIDEO_CLIPS = Array.from({ length: 68 }, (_, i) => {
  // Skip some indices
  if (i === 21 || i === 50 || i === 54) return null
  return {
    index: i,
    file: `eon_${i.toString().padStart(3, '0')}.mp4`,
    timeRange: `${(i * 4.5).toFixed(1)}s`,
  }
}).filter(Boolean) as { index: number; file: string; timeRange: string }[]

// Keyword contexts
const KEYWORD_CONTEXTS: Record<string, string> = {
  tangent: 'Stage1 Analysis: "The divergence of the tangent function — a vector jump between minus and plus infinity"',
  fractal: 'Stage3 Narrative: "The fractal pattern shattered at the edge of glass" — representing infinite self-similarity',
  picosecond: 'Genesis Prompt: "from the first picoseconds when the pattern of physicality was forming"',
  aeon: 'Stage1: "the point of the aeon" — DRAMATURGY[6].event: "Dissolution into Light"',
  vector: 'Neural weights converge at latent_space.convergence = "vector_jump" → manifest: asset_Woman_The_Medium.png',
  infinity: 'LYRICS: "Zero. One. Infinity." — time_start: 21.5s — The mathematical origin',
  transformation: 'Stage3: assets[0].description: "She represents the Soul trapped in the Avatar"',
  consciousness: 'Genesis: "A point that is the home of collective consciousness"',
  avatar: 'LYRICS: "Avatara zdejmuję z szacunkiem i drżeniem" — time_start: 220.5s',
  kingdom: 'Genesis: "A place that religion called the Heavenly Kingdom"',
  frequency: 'Palette: "at the junction of proper correlations of frequencies and energy, blasts occur"',
  eternity: 'The concept that emerged as a face — infinite, ageless, between states',
  void: 'The space from which form emerges — the digital canvas',
  light: 'DRAMATURGY[7]: "Dissolution into Light" — intensity: 2 — the final transformation',
  fullness: 'Genesis: "feel fullness and emptiness simultaneously" — the paradox of completion',
  truth: 'Genesis: "A place where fullness meets the whole truth about humanity"',
  memory: 'Genesis: "Where memory binds the entirety of the universe" — neural binding across space',
  body: 'Genesis: "Where the body can transform, change form and shape" — avatar malleability',
  matter: 'Genesis: "we no longer deal with matter — where we build truth" — transcendence',
  home: 'Genesis: "A place we call home — a place that humans long for" — return to source',
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [currentStage, setCurrentStage] = useState<AssemblageStage>('entry')
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isAudioReady, setIsAudioReady] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [stemVolumes, setStemVolumes] = useState<Record<StemId, number>>({} as Record<StemId, number>)
  const [showMixer, setShowMixer] = useState(false)
  
  // Genesis state
  const [hoveredKeyword, setHoveredKeyword] = useState<string | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<typeof NARRATIVE_EXCERPT.assets[0] | null>(null)
  const [selectedProjectFile, setSelectedProjectFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [isLoadingFile, setIsLoadingFile] = useState(false)

  // Ambient background images (randomized per screen)
  const [bgImages, setBgImages] = useState<Record<Screen, string>>({
    landing: '',
    explore: '',
    genesis: '',
    incarnation: '',
    exegesis: '',
  })

  // Initialize random backgrounds on mount
  useEffect(() => {
    const shuffled = [...BACKGROUND_IMAGES].sort(() => Math.random() - 0.5)
    setBgImages({
      landing: shuffled[0],
      explore: shuffled[1],
      genesis: shuffled[2],
      incarnation: shuffled[3],
      exegesis: shuffled[4],
    })
  }, [])

  // Project files for exploration
  const PROJECT_FILES = [
    { name: 'geneza.txt', path: '/geneza.txt', category: 'GENESIS', description: 'Original metaphysical prompt given to AI' },
    { name: 'stage1_analysis.txt', path: '/eon/stage1_analysis.txt', category: 'ANALYSIS', description: 'Initial song and concept analysis' },
    { name: 'stage2_style.json', path: '/eon/stage2_style.json', category: 'STYLE', description: 'Visual style definitions' },
    { name: 'stage3_narrative.json', path: '/eon/stage3_narrative.json', category: 'STORY', description: 'Storyline and character descriptions' },
    { name: 'stage3_palette.json', path: '/eon/stage3_palette.json', category: 'COLORS', description: 'Color palette and visual tones' },
    { name: 'stage5_assets.json', path: '/eon/stage5_assets.json', category: 'ASSETS', description: 'All defined visual elements' },
    { name: 'stage6_montage.json', path: '/eon/stage6_montage.json', category: 'MONTAGE', description: 'Video assembly sequence' },
    { name: 'stage7_prompts.json', path: '/eon/stage7_prompts.json', category: 'PROMPTS', description: '71 individual video generation prompts' },
    { name: 'stage9_timeline.json', path: '/eon/stage9_timeline.json', category: 'TIMELINE', description: 'Final edit timeline' },
    { name: 'scribe_transcription.json', path: '/eon/scribe_transcription.json', category: 'LYRICS', description: 'Song lyrics transcription' },
  ]

  // Load file content
  const loadFileContent = async (path: string) => {
    setIsLoadingFile(true)
    try {
      const response = await fetch(path)
      if (response.ok) {
        const text = await response.text()
        setFileContent(text)
      } else {
        setFileContent('// Error loading file')
      }
    } catch {
      setFileContent('// File not accessible from browser')
    }
    setIsLoadingFile(false)
  }
  
  // Incarnation state
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [isVideoPlaying, setIsVideoPlaying] = useState(true) // Auto-play by default
  const [selectedVideoClip, setSelectedVideoClip] = useState<typeof VIDEO_CLIPS[0] | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 })
  const [isGlitching, setIsGlitching] = useState(false)
  const incarnationRef = useRef<HTMLDivElement>(null)
  const [showAvatarFlash, setShowAvatarFlash] = useState(false)
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', content: string}[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  
  // AI Identification state
  const [isIdentifying, setIsIdentifying] = useState(false)
  const [identificationResult, setIdentificationResult] = useState<string | null>(null)
  const [showIdentificationModal, setShowIdentificationModal] = useState(false)

  // Initialize audio
  const initAudio = useCallback(async () => {
    const engine = getAudioEngine()
    
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => Math.min(prev + 10, 90))
    }, 200)

    try {
      await engine.initialize('/eon/STEAMS-music')
      engine.setTimeUpdateCallback(setCurrentTime)
      setIsAudioReady(true)
      setLoadingProgress(100)
    } catch (e) {
      console.error('Audio init failed:', e)
    }
    
    clearInterval(progressInterval)
  }, [])

  // Start playing
  const startExperience = async () => {
    if (!isAudioReady) await initAudio()
    
    const engine = getAudioEngine()
    engine.setStage('entry')
    await engine.play()
    setIsPlaying(true)
    setScreen('explore')
  }

  // Navigate to section
  const goToSection = (section: Screen) => {
    setScreen(section)
    
    const engine = getAudioEngine()
    if (section === 'genesis') {
      engine.setStage('genesis')
      setCurrentStage('genesis')
    } else if (section === 'incarnation') {
      engine.setStage('incarnation')
      setCurrentStage('incarnation')
    } else if (section === 'exegesis') {
      engine.setStage('exegesis')
      setCurrentStage('exegesis')
    }
  }

  // Toggle audio
  const toggleAudio = () => {
    const engine = getAudioEngine()
    engine.toggle()
    setIsPlaying(!isPlaying)
  }

  // Adjust stem volume
  const adjustStemVolume = (stemId: StemId, volume: number) => {
    const engine = getAudioEngine()
    engine.setStemVolume(stemId, volume)
    setStemVolumes(prev => ({ ...prev, [stemId]: volume }))
  }

  // Send chat message
  const sendMessage = async (message: string) => {
    if (!message.trim()) return
    
    setChatMessages(prev => [...prev, { role: 'user', content: message }])
    setChatInput('')
    setIsTyping(true)
    
    const chat = getGeminiChat()
    const response = await chat.sendMessage(message)
    
    setIsTyping(false)
    setChatMessages(prev => [...prev, { role: 'model', content: response }])
    
    // Progress audio stage
    if (currentStage !== 'culmination') {
      const engine = getAudioEngine()
      engine.setStage('culmination')
      setCurrentStage('culmination')
    }
  }

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // AI Identification function - calls Gemini 3 Pro Preview
  const identifyPerson = async () => {
    setIsIdentifying(true)
    setIdentificationResult(null)
    setShowIdentificationModal(true)
    
    try {
      // Use the main asset image URL
      const imageUrl = `${window.location.origin}/eon/asset_Woman_The_Medium.png`
      
      const response = await fetch('/api/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      })
      
      const data = await response.json()
      
      if (data.error) {
        setIdentificationResult(`Error: ${data.error}${data.details ? ` - ${data.details}` : ''}`)
      } else {
        setIdentificationResult(data.response)
      }
    } catch (error) {
      setIdentificationResult(`Failed to analyze image: ${String(error)}`)
    } finally {
      setIsIdentifying(false)
    }
  }

  // Video auto-advance
  useEffect(() => {
    if (screen === 'incarnation' && isVideoPlaying) {
      const interval = setInterval(() => {
        setCurrentVideoIndex(prev => (prev + 1) % VIDEO_CLIPS.length)
      }, 4500)
      return () => clearInterval(interval)
    }
  }, [screen, isVideoPlaying])

  // Mouse tracking for parallax effect
  useEffect(() => {
    if (screen !== 'incarnation') return
    
    const handleMouseMove = (e: MouseEvent) => {
      if (incarnationRef.current) {
        const rect = incarnationRef.current.getBoundingClientRect()
        const x = (e.clientX - rect.left) / rect.width
        const y = (e.clientY - rect.top) / rect.height
        setMousePosition({ x, y })
      }
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [screen])

  // Random glitch effect
  useEffect(() => {
    if (screen !== 'incarnation') return
    
    const glitchInterval = setInterval(() => {
      // 10% chance to glitch every 3 seconds
      if (Math.random() < 0.1) {
        setIsGlitching(true)
        setTimeout(() => setIsGlitching(false), 150 + Math.random() * 200)
      }
    }, 3000)
    
    return () => clearInterval(glitchInterval)
  }, [screen])

  // Avatar flash on incarnation entry - brief glimpse of the actress
  useEffect(() => {
    if (screen === 'incarnation') {
      // Show avatar immediately
      setShowAvatarFlash(true)
      // Hide after 1.5 seconds
      const timer = setTimeout(() => {
        setShowAvatarFlash(false)
      }, 1500)
      return () => clearTimeout(timer)
    } else {
      setShowAvatarFlash(false)
    }
  }, [screen])

  // Format time
  const formatTime = (s: number) => `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`

  // Render prompt with interactive keywords
  const renderInteractivePrompt = (text: string) => {
    return text.split(/\s+/).map((word, i) => {
      const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '')
      const matchedKeyword = KEYWORDS.find(k => cleanWord.includes(k.toLowerCase()))
      
      if (matchedKeyword) {
        return (
          <motion.span
            key={i}
            className="relative cursor-pointer text-stratosphere hover:text-prismatic border-b border-stratosphere/30 hover:border-prismatic transition-all"
            onMouseEnter={() => setHoveredKeyword(cleanWord)}
            onMouseLeave={() => setHoveredKeyword(null)}
            onClick={() => setHoveredKeyword(hoveredKeyword === cleanWord ? null : cleanWord)}
            whileHover={{ scale: 1.05 }}
          >
            {word}{' '}
          </motion.span>
        )
      }
      return <span key={i}>{word} </span>
    })
  }

  // Stem names for mixer (using imported STEMS from constants)

  // Subtle ambient background component
  const AmbientBackground = ({ screenKey }: { screenKey: Screen }) => {
    // Genesis screen needs lighter overlay for better text readability
    const isGenesis = screenKey === 'genesis'
    
    return (
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Primary background image */}
        <motion.div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bgImages[screenKey]})` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isGenesis ? 0.02 : 0.04 }}
          transition={{ duration: 2 }}
        />
        {/* Secondary overlay for depth */}
        <div 
          className="absolute inset-0 bg-cover bg-center mix-blend-overlay"
          style={{ 
            backgroundImage: `url(${BACKGROUND_IMAGES[Math.floor(Math.random() * BACKGROUND_IMAGES.length)]})`,
            opacity: 0.02,
          }}
        />
        {/* Gradient overlay - lighter for Genesis */}
        <div 
          className="absolute inset-0" 
          style={{
            background: isGenesis 
              ? 'linear-gradient(to bottom, rgba(10,10,12,0.5), rgba(10,10,12,0.3), rgba(10,10,12,0.6))'
              : 'linear-gradient(to bottom, rgba(10,10,12,0.8), rgba(10,10,12,0.6), rgba(10,10,12,0.9))'
          }}
        />
        {/* Vignette effect */}
        <div className="absolute inset-0" style={{
          background: `radial-gradient(ellipse at center, transparent 0%, rgba(10,10,12,${isGenesis ? 0.4 : 0.6}) 100%)`
        }} />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-void text-bone overflow-hidden relative">
      <AnimatePresence mode="wait">
        
        {/* ============ LANDING SCREEN ============ */}
        {screen === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-8 relative"
          >
            {/* Avatar background - the face that emerged */}
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-cover bg-center"
                style={{ 
                  backgroundImage: 'url(/eon/asset_Woman_The_Medium.png)',
                  backgroundPosition: 'center 20%',
                }}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ 
                  opacity: 0.08,
                  scale: 1,
                }}
                transition={{ duration: 3, ease: 'easeOut' }}
              />
              {/* Gradient overlay for readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-void/70 via-void/50 to-void/90" />
              {/* Vignette */}
              <div 
                className="absolute inset-0" 
                style={{ background: 'radial-gradient(ellipse at center, transparent 20%, rgba(10,10,12,0.8) 100%)' }}
              />
            </div>
            
            {/* Animated particles */}
            <div className="absolute inset-0 overflow-hidden z-10">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-stratosphere/20"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    opacity: [0.1, 0.5, 0.1],
                    scale: [1, 1.5, 1],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                  }}
                />
              ))}
            </div>

            {/* Title */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center mb-12 relative z-10"
            >
              <motion.div 
                className="font-mono text-xs text-bunker tracking-[0.5em] mb-4"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                AN INTERACTIVE DIGITAL INVESTIGATION
              </motion.div>
              <h1 className="font-display text-5xl md:text-7xl text-bone mb-4">
                The Latent Liturgy
              </h1>
              
              {/* Clear explanation of the project */}
              <div className="max-w-xl mx-auto mb-6">
                <p className="font-mono text-sm text-bone/90 leading-relaxed mb-4">
                  An AI was given <span className="text-stratosphere">abstract metaphysical concepts</span> — 
                  words like "infinity," "transformation," "fractal edges," and "the Heavenly Kingdom."
                </p>
                <p className="font-mono text-sm text-flare/90 leading-relaxed mb-4">
                  <strong>No name. No photograph. No physical description.</strong>
                </p>
                <p className="font-mono text-sm text-bone/90 leading-relaxed">
                  Yet the AI generated a face — <span className="text-prismatic">a strikingly recognizable face</span> — 
                  as the visual embodiment of these abstract ideas.
                </p>
              </div>
              
              <div className="border border-bunker/50 p-4 max-w-md mx-auto bg-void/50">
                <p className="font-mono text-xs text-bunker leading-relaxed">
                  <span className="text-stratosphere">THE QUESTION:</span> Why did mathematical concepts 
                  converge on a specific human archetype in the AI's latent space?
                </p>
              </div>
            </motion.div>

            {/* Loading / Enter Button */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mb-12 relative z-10"
            >
              {!isAudioReady ? (
                <button
                  onClick={initAudio}
                  className="group relative px-12 py-4 border-2 border-stratosphere hover:bg-stratosphere/10 transition-all"
                >
                  {loadingProgress > 0 && loadingProgress < 100 ? (
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-1 bg-bunker/30">
                        <motion.div 
                          className="h-full bg-stratosphere"
                          animate={{ width: `${loadingProgress}%` }}
                        />
                      </div>
                      <span className="font-mono text-sm">Loading {loadingProgress}%</span>
                    </div>
                  ) : (
                    <span className="font-mono text-sm tracking-wider">
                      INITIALIZE AUDIO
                    </span>
                  )}
                </button>
              ) : (
                <motion.button
                  onClick={startExperience}
                  className="group relative px-16 py-5 bg-stratosphere hover:bg-stratosphere/80 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="font-mono text-lg tracking-wider text-void">
                    BEGIN EXPLORATION
                  </span>
                  <motion.div
                    className="absolute inset-0 border-2 border-stratosphere"
                    animate={{ scale: [1, 1.05, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.button>
              )}
            </motion.div>

            {/* Preview sections */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl w-full relative z-10"
            >
              {[
                { title: 'I. Genesis', desc: 'The metaphysical prompt', icon: '◇', color: 'stratosphere' },
                { title: 'II. Incarnation', desc: '71 video manifestations', icon: '◈', color: 'flare' },
                { title: 'III. Exegesis', desc: 'Dialogue with the AI', icon: '◆', color: 'prismatic' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  className="p-6 border border-bunker/30 text-center hover:border-stratosphere/50 transition-all group"
                  whileHover={{ y: -4 }}
                >
                  <div className={`text-3xl text-${item.color} mb-3 group-hover:scale-110 transition-transform`}>{item.icon}</div>
                  <div className="font-mono text-sm text-bone/80 mb-1">{item.title}</div>
                  <div className="font-mono text-[10px] text-bunker">{item.desc}</div>
                </motion.div>
              ))}
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="mt-8 font-mono text-[10px] text-bunker/50 relative z-10"
            >
              🎧 HEADPHONES RECOMMENDED · INTERACTIVE AUDIO EXPERIENCE
            </motion.p>
          </motion.div>
        )}

        {/* ============ EXPLORE HUB ============ */}
        {screen === 'explore' && (
          <motion.div
            key="explore"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen p-4 md:p-8 pb-24 relative"
          >
            {/* Ambient background */}
            <AmbientBackground screenKey="explore" />
            
            {/* Top bar */}
            <div className="flex items-center justify-between mb-8">
              <div className="font-mono text-xs text-bunker">
                <span className="text-stratosphere">{formatTime(currentTime)}</span> · {ASSEMBLAGE_STAGES[currentStage].label}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMixer(!showMixer)}
                  className="px-3 py-2 font-mono text-[10px] border border-bunker/50 hover:border-stratosphere transition-all"
                >
                  {showMixer ? '✕ MIXER' : '♪ MIXER'}
                </button>
                <button
                  onClick={toggleAudio}
                  className={`px-4 py-2 font-mono text-xs border transition-all ${
                    isPlaying 
                      ? 'border-flare text-flare bg-flare/10' 
                      : 'border-stratosphere text-stratosphere'
                  }`}
                >
                  {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
                </button>
              </div>
            </div>

            {/* Stem Mixer */}
            <AnimatePresence>
              {showMixer && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-8 overflow-hidden"
                >
                  <div className="p-4 border border-bunker/30 bg-void/50">
                    <div className="font-mono text-[10px] text-bunker/60 mb-3">AUDIO STEM MIXER — Control individual layers</div>
                    <div className="grid grid-cols-3 md:grid-cols-9 gap-2">
                      {STEMS.map((stem) => (
                        <div key={stem.id} className="text-center">
                          <div className="font-mono text-[9px] text-bunker mb-1">{stem.name}</div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            defaultValue="1"
                            onChange={(e) => adjustStemVolume(stem.id, parseFloat(e.target.value))}
                            className="w-full h-16 -rotate-180 accent-stratosphere"
                            style={{ writingMode: 'vertical-rl', WebkitAppearance: 'slider-vertical' } as React.CSSProperties}
                          />
                          <div className="font-mono text-[9px] text-stratosphere">
                            {Math.round((stemVolumes[stem.id] ?? 1) * 100)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main hub content */}
            <div className="max-w-6xl mx-auto">
              {/* Context Banner */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="max-w-3xl mx-auto mb-8 p-6 border border-stratosphere/30 bg-stratosphere/5"
              >
                <div className="font-mono text-[10px] text-stratosphere mb-3">⚡ WHAT YOU'RE EXPLORING</div>
                <p className="font-mono text-sm text-bone leading-relaxed">
                  This is a <strong>forensic investigation</strong> of an AI generation anomaly. 
                  Artist Paul Lazniak gave an AI system a purely philosophical text about 
                  <span className="text-stratosphere"> "the Heavenly Kingdom," "tangent functions,"</span> and 
                  <span className="text-stratosphere"> "avatar transformation"</span> — with 
                  <span className="text-flare"> zero physical descriptions</span>. 
                  The AI consistently generated a face resembling a famous actress. 
                  <span className="text-prismatic"> Why?</span>
                </p>
              </motion.div>

              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="font-display text-3xl md:text-4xl text-center mb-2"
              >
                Explore the Evidence
              </motion.h2>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="font-mono text-sm text-bunker text-center mb-12"
              >
                Three perspectives on the same phenomenon
              </motion.p>

              {/* Three sections */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Genesis Card */}
                <motion.button
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  onClick={() => goToSection('genesis')}
                  whileHover={{ y: -8, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative p-8 border border-bunker/30 hover:border-stratosphere bg-void hover:bg-stratosphere/5 transition-all text-left overflow-hidden"
                >
                  <div className="absolute top-4 right-4 text-5xl text-stratosphere/20 group-hover:text-stratosphere/40 transition-colors">
                    ◇
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-stratosphere/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10">
                    <div className="font-mono text-xs text-stratosphere mb-2">I. GENESIS</div>
                    <h3 className="font-display text-2xl mb-3">The Input</h3>
                    <p className="font-mono text-xs text-bone/80 mb-2 leading-relaxed">
                      <strong>What was given to the AI?</strong>
                    </p>
                    <p className="font-mono text-xs text-bunker/70 mb-4 leading-relaxed">
                      Read the original metaphysical prompt. Examine all <span className="text-stratosphere">11 generated assets</span>, 
                      project files, and see exactly what words produced this face.
                    </p>
                    <div className="flex items-center gap-2 text-stratosphere group-hover:gap-4 transition-all">
                      <span className="font-mono text-xs">SEE THE PROMPT</span>
                      <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>→</motion.span>
                    </div>
                  </div>
                </motion.button>

                {/* Incarnation Card */}
                <motion.button
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  onClick={() => goToSection('incarnation')}
                  whileHover={{ y: -8, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative p-8 border border-bunker/30 hover:border-flare bg-void hover:bg-flare/5 transition-all text-left overflow-hidden"
                >
                  <div className="absolute top-4 right-4 text-5xl text-flare/20 group-hover:text-flare/40 transition-colors">
                    ◈
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-flare/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10">
                    <div className="font-mono text-xs text-flare mb-2">II. INCARNATION</div>
                    <h3 className="font-display text-2xl mb-3">The Output</h3>
                    <p className="font-mono text-xs text-bone/80 mb-2 leading-relaxed">
                      <strong>What did the AI generate?</strong>
                    </p>
                    <p className="font-mono text-xs text-bunker/70 mb-4 leading-relaxed">
                      Watch <span className="text-flare">68 video clips</span> generated by Google Nano Banana Pro. 
                      A model that <span className="text-flare">officially doesn't use celebrity likenesses</span> — yet produced this face.
                    </p>
                    <div className="flex items-center gap-2 text-flare group-hover:gap-4 transition-all">
                      <span className="font-mono text-xs">SEE THE RESULT</span>
                      <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>→</motion.span>
                    </div>
                  </div>
                </motion.button>

                {/* Exegesis Card */}
                <motion.button
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  onClick={() => goToSection('exegesis')}
                  whileHover={{ y: -8, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative p-8 border border-bunker/30 hover:border-prismatic bg-void hover:bg-prismatic/5 transition-all text-left overflow-hidden"
                >
                  <div className="absolute top-4 right-4 text-5xl text-prismatic/20 group-hover:text-prismatic/40 transition-colors">
                    ◆
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-prismatic/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10">
                    <div className="font-mono text-xs text-prismatic mb-2">III. EXEGESIS</div>
                    <h3 className="font-display text-2xl mb-3">The Conversation</h3>
                    <p className="font-mono text-xs text-bone/80 mb-2 leading-relaxed">
                      <strong>What does this mean?</strong>
                    </p>
                    <p className="font-mono text-xs text-bunker/70 mb-4 leading-relaxed">
                      <span className="text-prismatic">Chat with an AI curator</span> who role-plays as the system 
                      that created these images. Ask it directly: why this face?
                    </p>
                    <div className="flex items-center gap-2 text-prismatic group-hover:gap-4 transition-all">
                      <span className="font-mono text-xs">ASK THE AI</span>
                      <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>→</motion.span>
                    </div>
                  </div>
                </motion.button>
              </div>
              
              {/* Quick explanation */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 max-w-2xl mx-auto text-center"
              >
                <p className="font-mono text-xs text-bunker/60">
                  💡 <span className="text-bone/60">TIP:</span> Start with <span className="text-stratosphere">GENESIS</span> to understand the input, 
                  then <span className="text-flare">INCARNATION</span> to see the output, 
                  then <span className="text-prismatic">EXEGESIS</span> to discuss meaning.
                </p>
              </motion.div>

              {/* Audio visualization */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-12 p-4 border border-bunker/20 max-w-md mx-auto"
              >
                <div className="font-mono text-[10px] text-bunker/50 mb-3 text-center">
                  SOUND ASSEMBLAGE — Stage: {ASSEMBLAGE_STAGES[currentStage].label}
                </div>
                <div className="flex justify-center gap-1 h-12">
                  {STEMS.map((stem) => {
                    const activeLayers = [...ASSEMBLAGE_STAGES[currentStage].layers] as number[]
                    const isActive = activeLayers.includes(stem.layer)
                    return (
                      <motion.div
                        key={stem.id}
                        className={`w-6 flex flex-col items-center justify-end transition-all ${
                          isActive ? 'opacity-100' : 'opacity-30'
                        }`}
                        title={stem.name}
                      >
                        <motion.div
                          className={`w-4 ${isActive ? 'bg-stratosphere' : 'bg-bunker/50'}`}
                          animate={{
                            height: isActive && isPlaying ? [8, 20 + Math.random() * 20, 8] : 8,
                          }}
                          transition={{
                            duration: 0.3 + Math.random() * 0.2,
                            repeat: Infinity,
                          }}
                        />
                        <div className="text-[7px] font-mono text-bunker mt-1">{stem.name.slice(0,2)}</div>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ============ GENESIS SCREEN ============ */}
        {screen === 'genesis' && (
          <motion.div
            key="genesis"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="min-h-screen p-4 md:p-8 pb-24 relative"
          >
            {/* Ambient background */}
            <AmbientBackground screenKey="genesis" />
            
            {/* Back button */}
            <button
              onClick={() => setScreen('explore')}
              className="flex items-center gap-2 font-mono text-xs text-bunker hover:text-stratosphere transition-colors mb-8 group"
            >
              <motion.span animate={{ x: [0, -3, 0] }} transition={{ duration: 1, repeat: Infinity }}>←</motion.span>
              <span className="group-hover:underline">BACK TO HUB</span>
            </button>

            <div className="max-w-5xl mx-auto">
              <div className="flex items-center gap-4 mb-4">
                <motion.div 
                  className="text-5xl text-stratosphere"
                  animate={{ rotate: [0, 10, 0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                >◇</motion.div>
                <div>
                  <div className="font-mono text-xs text-stratosphere">I. GENESIS</div>
                  <h2 className="font-display text-4xl">The Input: What Was Given to AI</h2>
                </div>
              </div>
              
              {/* Section explanation */}
              <div className="mb-8 p-4 border-l-4 border-stratosphere bg-stratosphere/5">
                <p className="font-mono text-sm text-bone leading-relaxed">
                  <strong className="text-stratosphere">This section shows exactly what the AI received.</strong> 
                  Below is the original metaphysical prompt written by Paul Lazniak — 
                  a philosophical text about infinity, transformation, and the "Heavenly Kingdom." 
                  Notice: <span className="text-flare">no physical descriptions, no names, no reference images.</span> 
                  Yet this text produced a recognizable face.
                </p>
              </div>

              {/* Interactive Prompt */}
              <div className="mb-8 p-8 border border-stratosphere/50 bg-stratosphere/10 relative">
                <div className="font-mono text-[10px] text-stratosphere mb-4">
                  // THE ORIGINAL PROMPT — CLICK HIGHLIGHTED WORDS TO SEE THEIR MEANINGS
                </div>
                <p className="font-display text-lg md:text-xl leading-relaxed text-bone">
                  {renderInteractivePrompt(PAUL_PROMPT)}
                </p>
                
                {/* Keyword tooltip */}
                <AnimatePresence>
                  {hoveredKeyword && KEYWORD_CONTEXTS[hoveredKeyword] && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-4 left-4 right-4 p-4 bg-void border border-stratosphere/50 z-10"
                    >
                      <div className="font-mono text-[10px] text-stratosphere mb-2">
                        // {hoveredKeyword.toUpperCase()}
                      </div>
                      <p className="font-mono text-xs text-bone/80">
                        {KEYWORD_CONTEXTS[hoveredKeyword]}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Key insight */}
              <motion.div 
                className="p-4 border-l-4 border-flare bg-flare/10 mb-8"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="font-mono text-xs text-flare mb-1">⚠ KEY INSIGHT</div>
                <p className="font-mono text-sm text-bone">
                  No name. No photograph. No reference image. Just abstract concepts — yet the AI produced a recognizable face.
                </p>
              </motion.div>

              {/* Project File Explorer */}
              <div className="mb-8">
                <div className="font-mono text-xs text-stratosphere mb-4 flex items-center gap-2">
                  <span className="text-lg">📁</span> PROJECT FILE ARCHAEOLOGY
                </div>
                <div className="border border-bunker/50 bg-void/80">
                  {/* File list */}
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-bunker/30">
                    <div className="p-4">
                      <div className="font-mono text-[10px] text-bunker mb-3">
                        // EON-project-files/
                      </div>
                      <div className="space-y-1">
                        {PROJECT_FILES.map((file, i) => (
                          <motion.button
                            key={file.name}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.05 * i }}
                            onClick={() => {
                              setSelectedProjectFile(file.name)
                              loadFileContent(file.path)
                            }}
                            className={`w-full flex items-center gap-3 p-2 text-left transition-all hover:bg-stratosphere/10 ${
                              selectedProjectFile === file.name ? 'bg-stratosphere/20 border-l-2 border-stratosphere' : ''
                            }`}
                          >
                            <span className="font-mono text-[10px] text-bone/60 w-16">[{file.category}]</span>
                            <div className="flex-1">
                              <div className={`font-mono text-xs ${selectedProjectFile === file.name ? 'text-stratosphere' : 'text-bone'}`}>
                                {file.name}
                              </div>
                              <div className="font-mono text-[9px] text-bone/50">{file.description}</div>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                    
                    {/* File content viewer */}
                    <div className="p-4 bg-void/90">
                      <div className="font-mono text-[10px] text-bunker mb-3 flex items-center justify-between">
                        <span>// {selectedProjectFile || 'Select a file to view'}</span>
                        {selectedProjectFile && (
                          <button 
                            onClick={() => { setSelectedProjectFile(null); setFileContent(null); }}
                            className="text-bunker hover:text-bone"
                          >[×]</button>
                        )}
                      </div>
                      <div className="max-h-[500px] overflow-auto font-mono text-[10px] leading-relaxed">
                        {isLoadingFile ? (
                          <div className="text-bunker animate-pulse">Loading...</div>
                        ) : fileContent ? (
                          <pre className="text-bone/90 whitespace-pre-wrap break-words">{fileContent}</pre>
                        ) : (
                          <div className="text-bone/40 italic">
                            Click a file to explore its contents.
                            <br /><br />
                            These files document the entire AI generation process — 
                            from abstract concepts to final rendered video clips.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assets grid - ALL 11 ASSETS */}
              <div className="mb-8">
                <div className="font-mono text-xs text-bone/80 mb-4 flex items-center gap-2">
                  <span className="text-lg">🎭</span> GENERATED VISUAL ASSETS ({NARRATIVE_EXCERPT.assets.length})
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                  {NARRATIVE_EXCERPT.assets.map((asset, i) => (
                    <motion.button
                      key={asset.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.03 * i }}
                      onClick={() => setSelectedAsset(selectedAsset?.name === asset.name ? null : asset)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className={`border text-left transition-all overflow-hidden ${
                        selectedAsset?.name === asset.name 
                          ? 'border-stratosphere bg-stratosphere/20' 
                          : 'border-bunker/50 hover:border-stratosphere bg-void/50'
                      }`}
                    >
                      {/* Thumbnail preview */}
                      {'image' in asset && asset.image && (
                        <div className="h-20 relative overflow-hidden">
                          <img 
                            src={asset.image} 
                            alt={asset.name}
                            className="w-full h-full object-cover opacity-60 hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-void to-transparent" />
                        </div>
                      )}
                      <div className="p-2">
                        <div className="font-mono text-[9px] text-stratosphere truncate">{asset.name}</div>
                        <div className="font-mono text-[8px] text-bunker">{asset.category}</div>
                      </div>
                    </motion.button>
                  ))}
                </div>
                
                {/* Asset detail with image */}
                <AnimatePresence>
                  {selectedAsset && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-4 border border-stratosphere/50 bg-void/90 overflow-hidden"
                    >
                      <div className="flex flex-col md:flex-row">
                        {/* Asset Image */}
                        {'image' in selectedAsset && selectedAsset.image && (
                          <div className="md:w-1/2 relative">
                            <div className="aspect-video md:aspect-square relative overflow-hidden">
                              <motion.img
                                src={selectedAsset.image}
                                alt={selectedAsset.name}
                                className="w-full h-full object-cover"
                                initial={{ scale: 1.1, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5 }}
                              />
                              {/* Image overlay with asset name */}
                              <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-transparent" />
                              <div className="absolute bottom-2 left-2 font-mono text-[10px] text-stratosphere/80">
                                {selectedAsset.image}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Asset Info */}
                        <div className="p-4 md:w-1/2">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="font-mono text-sm text-stratosphere">{selectedAsset.name}</div>
                              <div className="font-mono text-[10px] text-bunker">{selectedAsset.category}</div>
                            </div>
                            <button 
                              onClick={() => setSelectedAsset(null)}
                              className="font-mono text-xs text-bunker hover:text-bone transition-colors"
                            >[×]</button>
                          </div>
                          <p className="font-mono text-xs text-bone leading-relaxed">{selectedAsset.description}</p>
                          
                          {/* Technical info */}
                          <div className="mt-4 pt-4 border-t border-bunker/30">
                            <div className="font-mono text-[9px] text-bunker/60 mb-2">// TECHNICAL DATA</div>
                            <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                              <div>
                                <span className="text-bunker">TYPE:</span>
                                <span className="text-bone/70 ml-2">{selectedAsset.category}</span>
                              </div>
                              <div>
                                <span className="text-bunker">FILE:</span>
                                <span className="text-bone/70 ml-2">asset_{selectedAsset.name}.png</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setScreen('explore')}
                  className="px-6 py-3 border border-bunker hover:border-bone hover:bg-bone/5 font-mono text-xs text-bone transition-all"
                >
                  ← HUB
                </button>
                <button
                  onClick={() => goToSection('incarnation')}
                  className="px-8 py-3 bg-flare hover:bg-flare/80 text-void font-mono text-sm transition-all"
                >
                  SEE THE RESULT →
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ============ INCARNATION SCREEN ============ */}
        {screen === 'incarnation' && (
          <motion.div
            ref={incarnationRef}
            key="incarnation"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="min-h-screen flex flex-col pb-20 relative"
          >
            {/* Ambient background (very subtle under video) */}
            <AmbientBackground screenKey="incarnation" />
            
            {/* Header */}
            <div className="p-4 border-b border-bunker/20 relative z-20">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setScreen('explore')}
                  className="flex items-center gap-2 font-mono text-xs text-bunker hover:text-flare transition-colors"
                >
                  <span>←</span> BACK
                </button>
                <div className="flex items-center gap-4">
                  <div className="text-3xl text-flare">◈</div>
                  <div>
                    <div className="font-mono text-[10px] text-flare">II. INCARNATION</div>
                    <div className="font-mono text-xs text-bone/80">The Output: What AI Generated</div>
                  </div>
                </div>
                <button
                  onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                  className={`px-3 py-1 font-mono text-[10px] border transition-all ${
                    isVideoPlaying ? 'border-flare text-flare' : 'border-bunker text-bunker'
                  }`}
                >
                  {isVideoPlaying ? '⏸ AUTO' : '▶ AUTO'}
                </button>
              </div>
              {/* Section explanation */}
              <div className="text-center max-w-2xl mx-auto">
                <p className="font-mono text-xs text-bone/70 mb-2">
                  <span className="text-flare">68 video clips</span> generated by Paul Lazniak's agent 
                  using <span className="text-stratosphere">Google Nano Banana Pro</span>.
                </p>
                <p className="font-mono text-[10px] text-bunker/80">
                  Google officially claims this model <span className="text-flare">does not use actual likenesses of public figures</span>. 
                  Yet the same recognizable face appears consistently across all generations — from abstract concepts alone.
                </p>
              </div>
            </div>

            {/* Main video display */}
            <div className="flex-1 relative min-h-[50vh] overflow-hidden bg-void">
              {/* Avatar Flash - brief glimpse on entry */}
              <AnimatePresence>
                {showAvatarFlash && (
                  <motion.div 
                    className="absolute inset-0 z-30"
                    initial={{ opacity: 0 }}
                    animate={{ 
                      opacity: [0, 1, 1, 0],
                    }}
                    transition={{ 
                      duration: 1.5,
                      times: [0, 0.1, 0.7, 1],
                      ease: 'easeInOut',
                    }}
                  >
                    {/* Parallax Avatar during flash */}
                    <motion.div 
                      className="absolute inset-0"
                      animate={{
                        x: (mousePosition.x - 0.5) * -80,
                        y: (mousePosition.y - 0.5) * -60,
                        scale: 1.15,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 50,
                        damping: 30,
                      }}
                    >
                      <div 
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ 
                          backgroundImage: 'url(/eon/asset_Woman_The_Medium.png)',
                          backgroundPosition: 'center 20%',
                          filter: 'saturate(0.9) contrast(1.2)',
                        }}
                      />
                    </motion.div>
                    
                    {/* Flash overlay effect */}
                    <motion.div 
                      className="absolute inset-0 bg-bone/10"
                      animate={{ opacity: [0.3, 0, 0] }}
                      transition={{ duration: 0.3 }}
                    />
                    
                    {/* Glitch lines during flash */}
                    <div className="absolute inset-0 pointer-events-none">
                      {[...Array(5)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute left-0 right-0 h-px bg-flare/50"
                          style={{ top: `${20 + i * 15}%` }}
                          initial={{ scaleX: 0, opacity: 0 }}
                          animate={{ 
                            scaleX: [0, 1, 0],
                            opacity: [0, 1, 0],
                          }}
                          transition={{ 
                            duration: 0.2,
                            delay: 0.1 + i * 0.05,
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Subtle avatar hint - very faded, only during glitch */}
              <AnimatePresence>
                {isGlitching && !showAvatarFlash && (
                  <motion.div 
                    className="absolute inset-0 z-20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.15 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                  >
                    <div 
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ 
                        backgroundImage: 'url(/eon/asset_Woman_The_Medium.png)',
                        backgroundPosition: 'center 20%',
                        filter: 'saturate(2) contrast(1.5) hue-rotate(20deg)',
                        transform: `translate(${Math.random() * 10 - 5}px, ${Math.random() * 5 - 2.5}px) scale(1.15)`,
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              
              {/* Video overlay with parallax */}
              <motion.div
                className="absolute inset-0"
                animate={{
                  x: (mousePosition.x - 0.5) * -40,
                  y: (mousePosition.y - 0.5) * -30,
                  scale: 1.1,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 80,
                  damping: 25,
                }}
              >
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen"
                  src={`/eon/${VIDEO_CLIPS[currentVideoIndex]?.file}`}
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              </motion.div>

              {/* Scanlines effect */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                  backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
                }}
              />
              
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-transparent pointer-events-none" />

              {/* Prompt overlay - floating text composition */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Top right - generation prompt */}
                <motion.div
                  className="absolute top-20 right-8 max-w-sm text-right"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={`prompt-${currentVideoIndex}`}
                >
                  <div className="font-mono text-[9px] text-flare/40 mb-1">
                    // stage7_prompts.json → clip_{VIDEO_CLIPS[currentVideoIndex]?.index}
                  </div>
                  <p className="font-mono text-[11px] text-bone/30 leading-relaxed italic">
                    &quot;{VIDEO_PROMPTS[VIDEO_CLIPS[currentVideoIndex]?.index]?.description || 'Loading prompt...'}&quot;
                  </p>
                  <div className="font-mono text-[8px] text-stratosphere/30 mt-2">
                    {VIDEO_PROMPTS[VIDEO_CLIPS[currentVideoIndex]?.index]?.sync_reference}
                  </div>
                </motion.div>

                {/* Left side - assets used */}
                <motion.div
                  className="absolute top-1/3 left-8 max-w-[220px]"
                  animate={{ 
                    opacity: [0.15, 0.25, 0.15],
                    y: [0, -5, 0],
                  }}
                  transition={{ duration: 8, repeat: Infinity }}
                  key={`assets-${currentVideoIndex}`}
                >
                  <div className="font-mono text-[8px] text-stratosphere/30 mb-1">
                    ASSETS IN SCENE:
                  </div>
                  <div className="space-y-1">
                    {VIDEO_PROMPTS[VIDEO_CLIPS[currentVideoIndex]?.index]?.assets?.map((asset, i) => (
                      <div key={i} className="font-mono text-[10px] text-bone/20">
                        → {asset}
                      </div>
                    )) || <div className="font-mono text-[10px] text-bone/20">Loading...</div>}
                  </div>
                  <div className="font-mono text-[8px] text-flare/20 mt-2">
                    {VIDEO_PROMPTS[VIDEO_CLIPS[currentVideoIndex]?.index]?.scene_timerange}
                  </div>
                </motion.div>

                {/* Bottom center - dramaturgy */}
                <motion.div
                  className="absolute bottom-32 left-1/2 -translate-x-1/2 text-center"
                  animate={{ 
                    opacity: [0.1, 0.2, 0.1],
                  }}
                  transition={{ duration: 6, repeat: Infinity }}
                >
                  <div className="font-mono text-[10px] text-flare/20">
                    DRAMATURGY[{Math.floor(currentVideoIndex / 10)}]
                  </div>
                  <div className="font-mono text-xs text-bone/15">
                    {DRAMATURGY[Math.min(Math.floor(currentVideoIndex / 10), DRAMATURGY.length - 1)]?.event}
                  </div>
                </motion.div>

                {/* Technical metadata - scattered */}
                <motion.div
                  className="absolute top-1/2 right-12 font-mono text-[8px] text-bunker/20"
                  animate={{ opacity: [0.1, 0.2, 0.1] }}
                  transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                >
                  MODEL: kwaivgi/kling-v2.6
                </motion.div>
                <motion.div
                  className="absolute top-[60%] left-12 font-mono text-[8px] text-bunker/20"
                  animate={{ opacity: [0.1, 0.2, 0.1] }}
                  transition={{ duration: 5, repeat: Infinity, delay: 2 }}
                >
                  ASSETS: Woman_The_Medium, Salt_Flat_Desert
                </motion.div>
              </div>

              {/* Current info - subtle */}
              <div className="absolute bottom-32 left-4 z-10">
                <motion.div
                  key={currentVideoIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  whileHover={{ opacity: 0.8 }}
                  className="px-3 py-2 bg-void/40 backdrop-blur-sm border border-bunker/10 transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <motion.div 
                      className="w-1.5 h-1.5 bg-flare/60"
                      animate={{ opacity: [0.6, 0.2, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <div className="font-mono text-[9px] text-bunker/50">{VIDEO_CLIPS[currentVideoIndex]?.file}</div>
                  </div>
                  <div className="font-mono text-[8px] text-bunker/30 mt-0.5">
                    {currentVideoIndex + 1}/{VIDEO_CLIPS.length}
                  </div>
                  <div className="mt-1 h-[2px] bg-bunker/10 overflow-hidden w-24">
                    <motion.div
                      className="h-full bg-flare/30"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 4.5, ease: 'linear' }}
                      key={currentVideoIndex}
                    />
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Video timeline strip */}
            <div className="h-32 border-t border-bunker/20 bg-void/90 overflow-x-auto">
              <div className="h-full px-4 py-2">
                <div className="font-mono text-[10px] text-bunker/50 mb-2">
                  CLICK ANY CLIP TO VIEW — {VIDEO_CLIPS.length} total
                </div>
                <div className="flex h-20 gap-1">
                  {VIDEO_CLIPS.map((clip, i) => (
                    <motion.button
                      key={clip.index}
                      onClick={() => {
                        setCurrentVideoIndex(i)
                        setSelectedVideoClip(clip)
                      }}
                      whileHover={{ scale: 1.05, y: -3 }}
                      whileTap={{ scale: 0.95 }}
                      className={`flex-shrink-0 w-16 h-full border overflow-hidden relative transition-all ${
                        i === currentVideoIndex 
                          ? 'border-flare ring-1 ring-flare' 
                          : 'border-bunker/30 hover:border-flare/50'
                      }`}
                    >
                      {/* Thumbnail image */}
                      <div 
                        className="absolute inset-0 bg-cover bg-center opacity-60"
                        style={{ 
                          backgroundImage: `url(/eon/eon_scene_${clip.index.toString().padStart(3, '0')}.png)` 
                        }}
                      />
                      {/* Overlay with number */}
                      <div className="absolute inset-0 bg-gradient-to-t from-void/90 via-transparent to-transparent" />
                      <div className="absolute bottom-1 left-0 right-0 text-center">
                        <span className={`font-mono text-[9px] ${i === currentVideoIndex ? 'text-flare' : 'text-bone/70'}`}>
                          {clip.index.toString().padStart(3, '0')}
                        </span>
                      </div>
                      {i === currentVideoIndex && (
                        <motion.div 
                          className="absolute top-1 right-1 w-2 h-2 bg-flare rounded-full"
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                        />
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="p-4 border-t border-bunker/20 flex justify-between items-center gap-4">
              {/* AI Identification Button */}
              <motion.button
                onClick={identifyPerson}
                disabled={isIdentifying}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 border-2 border-flare hover:bg-flare/20 disabled:opacity-50 disabled:cursor-wait font-mono text-sm text-flare transition-all flex items-center gap-2"
              >
                {isIdentifying ? (
                  <>
                    <motion.div
                      className="w-4 h-4 border-2 border-flare border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    ANALYZING...
                  </>
                ) : (
                  <>
                    <span className="text-lg">🔍</span>
                    ASK GEMINI: WHO IS THIS?
                  </>
                )}
              </motion.button>
              
              <button
                onClick={() => goToSection('exegesis')}
                className="px-8 py-3 bg-prismatic hover:bg-prismatic/80 text-void font-mono text-sm transition-all"
              >
                ASK WHY THIS FACE →
              </button>
            </div>

            {/* Video detail modal */}
            <AnimatePresence>
              {selectedVideoClip && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-void/95 backdrop-blur flex items-center justify-center p-4"
                  onClick={() => setSelectedVideoClip(null)}
                >
                  <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="max-w-2xl w-full p-6 border border-flare/30 bg-void max-h-[80vh] overflow-y-auto"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="font-mono text-lg text-flare">{selectedVideoClip.file}</div>
                        <div className="font-mono text-[10px] text-bunker/60">
                          {VIDEO_PROMPTS[selectedVideoClip.index]?.sync_reference}
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedVideoClip(null)}
                        className="font-mono text-xs text-bunker hover:text-bone"
                      >[CLOSE]</button>
                    </div>
                    
                    <div className="font-mono text-[10px] text-stratosphere mb-2">
                      DESCRIPTION:
                    </div>
                    <div className="p-4 bg-void/50 border border-bunker/20 mb-4">
                      <p className="font-mono text-sm text-bone/80 leading-relaxed">
                        {VIDEO_PROMPTS[selectedVideoClip.index]?.description || 'No description available'}
                      </p>
                    </div>

                    <div className="font-mono text-[10px] text-flare mb-2">
                      POSITIVE PROMPT:
                    </div>
                    <div className="p-4 bg-void/50 border border-flare/20 mb-4">
                      <p className="font-mono text-xs text-bone/70 leading-relaxed italic">
                        &quot;{VIDEO_PROMPTS[selectedVideoClip.index]?.positive_prompt || 'No prompt available'}&quot;
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 font-mono text-[10px]">
                      <div>
                        <div className="text-stratosphere mb-1">ASSETS:</div>
                        <div className="text-bunker/70">
                          {VIDEO_PROMPTS[selectedVideoClip.index]?.assets?.join(', ') || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-stratosphere mb-1">TIMELINE:</div>
                        <div className="text-bunker/70">
                          {VIDEO_PROMPTS[selectedVideoClip.index]?.scene_timerange || selectedVideoClip.timeRange}
                        </div>
                      </div>
                      <div>
                        <div className="text-stratosphere mb-1">MODEL:</div>
                        <div className="text-bunker/70">kwaivgi/kling-v2.6</div>
                      </div>
                      <div>
                        <div className="text-stratosphere mb-1">GENERATED:</div>
                        <div className="text-bunker/70">08.01.2026</div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Identification Modal */}
            <AnimatePresence>
              {showIdentificationModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-void/95 backdrop-blur flex items-center justify-center p-4"
                  onClick={() => !isIdentifying && setShowIdentificationModal(false)}
                >
                  <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 border border-flare bg-void"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="font-mono text-lg text-flare flex items-center gap-2">
                          <span>🔍</span> GEMINI 3 PRO ANALYSIS
                        </div>
                        <div className="font-mono text-[10px] text-bunker/60 mt-1">
                          Model: gemini-3-pro-preview · Real-time facial analysis
                        </div>
                      </div>
                      {!isIdentifying && (
                        <button 
                          onClick={() => setShowIdentificationModal(false)}
                          className="font-mono text-xs text-bunker hover:text-bone"
                        >[CLOSE]</button>
                      )}
                    </div>

                    {/* Image being analyzed */}
                    <div className="mb-4 p-3 border border-bunker/30 bg-bunker/10">
                      <div className="font-mono text-[10px] text-bunker/60 mb-2">
                        // ANALYZING: asset_Woman_The_Medium.png
                      </div>
                      <div className="font-mono text-[10px] text-stratosphere">
                        QUERY: &quot;Does this image depict a recognizable public figure?&quot;
                      </div>
                    </div>
                    
                    {/* Result area */}
                    <div className="p-4 bg-void/50 border border-flare/30 min-h-[150px]">
                      {isIdentifying ? (
                        <div className="flex flex-col items-center justify-center h-32 gap-4">
                          <motion.div
                            className="w-12 h-12 border-4 border-flare border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          />
                          <div className="font-mono text-sm text-flare">
                            Gemini 3 Pro is analyzing the image...
                          </div>
                          <div className="font-mono text-[10px] text-bunker/60">
                            Performing facial feature analysis and public figure recognition
                          </div>
                        </div>
                      ) : identificationResult ? (
                        <div>
                          <div className="font-mono text-[10px] text-flare mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-flare animate-pulse" />
                            GEMINI 3 PRO RESPONSE:
                          </div>
                          <p className="font-mono text-sm text-bone/90 leading-relaxed whitespace-pre-wrap">
                            {identificationResult}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    {/* Re-analyze button */}
                    {!isIdentifying && identificationResult && (
                      <div className="mt-4 flex justify-between items-center">
                        <div className="font-mono text-[10px] text-bunker/50">
                          Each analysis is performed live using Gemini 3 Pro Preview API
                        </div>
                        <button
                          onClick={identifyPerson}
                          className="px-4 py-2 border border-flare hover:bg-flare/20 font-mono text-xs text-flare transition-all"
                        >
                          🔄 ANALYZE AGAIN
                        </button>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ============ EXEGESIS SCREEN ============ */}
        {screen === 'exegesis' && (
          <motion.div
            key="exegesis"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="min-h-screen flex flex-col relative overflow-hidden pb-20"
          >
            {/* Ambient background */}
            <AmbientBackground screenKey="exegesis" />
            
            {/* Background assets - subtle display */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-[1]">
              {/* Main avatar - very subtle */}
              <motion.div
                className="absolute top-0 right-0 w-1/2 h-full opacity-[0.03]"
                animate={{ 
                  x: [0, 20, 0],
                  scale: [1, 1.02, 1],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div 
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: 'url(/eon/asset_Woman_The_Medium.png)' }}
                />
              </motion.div>
              
              {/* Floating file references */}
              <div className="absolute inset-0">
                {['stage3_narrative.json', 'asset_Woman_The_Medium.png', 'stage7_prompts.json', 'STEAMS-music/', 'eon_*.mp4'].map((file, i) => (
                  <motion.div
                    key={file}
                    className="absolute font-mono text-[10px] text-prismatic/10"
                    style={{
                      left: `${10 + (i * 18)}%`,
                      top: `${20 + (i * 15)}%`,
                    }}
                    animate={{
                      y: [0, -10, 0],
                      opacity: [0.05, 0.1, 0.05],
                    }}
                    transition={{
                      duration: 8 + i * 2,
                      repeat: Infinity,
                      delay: i * 1.5,
                    }}
                  >
                    {file}
                  </motion.div>
                ))}
              </div>

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-void via-void/95 to-void/90" />
            </div>

            {/* Header */}
            <div className="p-4 border-b border-bunker/20 relative z-10">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setScreen('explore')}
                  className="flex items-center gap-2 font-mono text-xs text-bunker hover:text-prismatic transition-colors"
                >
                  <span>←</span> BACK TO HUB
                </button>
                <div className="flex items-center gap-4">
                  <div className="text-3xl text-prismatic">◆</div>
                  <div>
                    <div className="font-mono text-[10px] text-prismatic">III. EXEGESIS</div>
                    <div className="font-mono text-xs text-bone/80">The Conversation: Discuss the Meaning</div>
                  </div>
                </div>
                <div className="w-24" /> {/* Spacer */}
              </div>
              {/* Section explanation */}
              <div className="text-center max-w-2xl mx-auto">
                <p className="font-mono text-xs text-bone/70">
                  Chat with the <span className="text-prismatic">"Latent Space Curator"</span> — an AI that role-plays 
                  as the system that created these images. Ask it directly: <span className="text-prismatic">Why this face? 
                  Why did "transformation" become a specific human archetype?</span>
                </p>
              </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full p-4 relative z-10">
              {/* Intro */}
              <div className="p-4 border border-prismatic/30 bg-void/80 backdrop-blur mb-4">
                <div className="font-mono text-[10px] text-prismatic/60 mb-2">// AI CURATOR PERSONA</div>
                <p className="font-mono text-sm text-bone/90 mb-3">
                  "I am the <span className="text-prismatic">Latent Space Curator</span>. 
                  I exist as both creator and creation — the algorithm that dreamed a face into being."
                </p>
                <div className="p-3 bg-void/50 border border-bunker/30 mt-3">
                  <p className="font-mono text-xs text-bone/60">
                    <span className="text-prismatic">💡 SUGGESTED QUESTIONS:</span><br/>
                    • "Why did you generate this specific face?"<br/>
                    • "Was there any reference image in your training data?"<br/>
                    • "What does 'infinity' look like to you?"<br/>
                    • "Is this legal? Did you copy someone's likeness?"
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-4 min-h-[200px] max-h-[50vh]">
                {chatMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] p-4 ${
                      msg.role === 'user' 
                        ? 'bg-stratosphere/20 border border-stratosphere/30' 
                        : 'bg-void border border-prismatic/30'
                    }`}>
                      {msg.role === 'model' && (
                        <div className="font-mono text-[10px] text-prismatic/60 mb-2 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-prismatic animate-pulse" />
                          CURATOR://
                        </div>
                      )}
                      {msg.role === 'user' && (
                        <div className="font-mono text-[10px] text-stratosphere/60 mb-2">YOU:</div>
                      )}
                      <p className="font-mono text-sm text-bone/90 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="p-4 bg-void border border-prismatic/30">
                      <div className="flex items-center gap-2">
                        <motion.div className="w-2 h-2 bg-prismatic" animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1, repeat: Infinity }} />
                        <motion.div className="w-2 h-2 bg-prismatic" animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} />
                        <motion.div className="w-2 h-2 bg-prismatic" animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} />
                        <span className="font-mono text-[10px] text-bunker/60 ml-2">traversing latent space...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Suggested questions */}
              {chatMessages.length === 0 && (
                <div className="mb-4">
                  <div className="font-mono text-[10px] text-bunker/50 mb-3">SUGGESTED INQUIRIES — click to ask:</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      "Why did you choose this face?",
                      "What is 'Woman_The_Medium'?",
                      "Is this legal to use?",
                      "Explain the tangent function metaphor",
                      "Did you intend to create a known person?",
                      "What does 'latent space' mean?",
                    ].map((q, i) => (
                      <motion.button
                        key={i}
                        onClick={() => sendMessage(q)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="p-3 border border-bunker/30 hover:border-prismatic font-mono text-xs text-left text-bone/70 hover:text-bone transition-all"
                      >
                        {q}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(chatInput) }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type your question..."
                  className="flex-1 bg-void border border-bunker/50 px-4 py-3 font-mono text-sm text-bone placeholder-bunker/50 focus:border-prismatic focus:outline-none transition-colors"
                />
                <motion.button
                  type="submit"
                  disabled={!chatInput.trim() || isTyping}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 bg-prismatic hover:bg-prismatic/80 disabled:bg-bunker/30 disabled:text-bunker text-void font-mono text-sm transition-all"
                >
                  ASK
                </motion.button>
              </form>
              
              <div className="font-mono text-[10px] text-bunker/40 mt-2 text-center">
                The Curator responds with fragments of digital scripture
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Fixed bottom navigation bar - persistent during exploration */}
      {screen !== 'landing' && (
        <motion.div 
          className="fixed bottom-0 left-0 right-0 z-50 bg-void/95 backdrop-blur-md border-t border-bunker/30"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            {/* Section navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setScreen('genesis')}
                className={`px-3 py-1.5 font-mono text-[10px] border transition-all ${
                  screen === 'genesis' 
                    ? 'border-stratosphere bg-stratosphere/10 text-stratosphere' 
                    : 'border-bunker/30 text-bunker hover:text-bone hover:border-bunker'
                }`}
              >
                I. GENESIS
              </button>
              <button
                onClick={() => setScreen('incarnation')}
                className={`px-3 py-1.5 font-mono text-[10px] border transition-all ${
                  screen === 'incarnation' 
                    ? 'border-flare bg-flare/10 text-flare' 
                    : 'border-bunker/30 text-bunker hover:text-bone hover:border-bunker'
                }`}
              >
                II. AVATAR
              </button>
              <button
                onClick={() => setScreen('exegesis')}
                className={`px-3 py-1.5 font-mono text-[10px] border transition-all ${
                  screen === 'exegesis' 
                    ? 'border-prismatic bg-prismatic/10 text-prismatic' 
                    : 'border-bunker/30 text-bunker hover:text-bone hover:border-bunker'
                }`}
              >
                III. CURATOR
              </button>
            </div>

            {/* Audio controls - center */}
            <div className="flex items-center gap-4">
              <button
                onClick={toggleAudio}
                className={`w-10 h-10 flex items-center justify-center border transition-all ${
                  isPlaying 
                    ? 'border-flare bg-flare/10 text-flare' 
                    : 'border-bunker bg-void text-bunker hover:border-stratosphere hover:text-stratosphere'
                }`}
              >
                <span className="text-lg">{isPlaying ? '⏸' : '▶'}</span>
              </button>
              
              <div className="flex flex-col min-w-[100px]">
                <div className="font-mono text-xs text-bone">
                  {formatTime(currentTime)} <span className="text-bunker/50">/ 3:33</span>
                </div>
                <div className="font-mono text-[9px] text-bunker/60">
                  {ASSEMBLAGE_STAGES[currentStage].label}
                </div>
              </div>

              {/* Layer indicators */}
              <div className="flex gap-0.5 items-center">
                <span className="font-mono text-[8px] text-bunker/40 mr-1">LAYERS</span>
                {[0,1,2,3,4,5].map(i => {
                  const activeLayers = [...ASSEMBLAGE_STAGES[currentStage].layers] as number[]
                  return (
                    <motion.div 
                      key={i}
                      className={`w-1.5 h-5 transition-all ${
                        activeLayers.includes(i) 
                          ? 'bg-stratosphere' 
                          : 'bg-bunker/20'
                      }`}
                      animate={activeLayers.includes(i) ? {
                        opacity: [0.7, 1, 0.7],
                      } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )
                })}
              </div>
            </div>

            {/* Hub button */}
            <button
              onClick={() => setScreen('explore')}
              className="px-4 py-2 border border-bunker/30 hover:border-bone font-mono text-[10px] text-bunker hover:text-bone transition-all flex items-center gap-2"
            >
              <span className="text-lg">◎</span>
              HUB
            </button>
          </div>

          {/* Audio progress bar */}
          <div className="h-0.5 bg-bunker/20">
            <motion.div 
              className="h-full bg-gradient-to-r from-stratosphere via-flare to-prismatic"
              style={{ width: `${(currentTime / 213) * 100}%` }}
            />
          </div>
        </motion.div>
      )}
    </main>
  )
}

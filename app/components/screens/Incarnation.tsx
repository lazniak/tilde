'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLiturgy } from '@/app/lib/LiturgyContext'
import { RichText, useI18n } from '@/app/lib/i18n/I18nProvider'
import { AVATAR_IMAGE, DRAMATURGY, VIDEO_CLIPS, VIDEO_PROMPTS } from '@/app/lib/constants'
import { gatedFetch } from '@/app/lib/curatorClient'
import { AmbientBackground } from '../AmbientBackground'
import { Modal } from '../Modal'
import { Slot } from '../Slot'

type Clip = (typeof VIDEO_CLIPS)[number]

interface IdentifyResult {
  response: string
  model: string
  recognised?: boolean
  tally?: { total?: number; recognised?: number }
}

export function Incarnation() {
  const { setScreen, goToSection, isTouch, reducedMotion, consentGiven, setConsentGiven } = useLiturgy()
  const { t, lang } = useI18n()

  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [isVideoPlaying, setIsVideoPlaying] = useState(true)
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 })
  const [isGlitching, setIsGlitching] = useState(false)
  const [showAvatarFlash, setShowAvatarFlash] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)

  const [isIdentifying, setIsIdentifying] = useState(false)
  const [identification, setIdentification] = useState<IdentifyResult | null>(null)
  const [identifyError, setIdentifyError] = useState<string | null>(null)
  const [showIdentify, setShowIdentify] = useState(false)

  const clip = VIDEO_CLIPS[currentVideoIndex]
  const prompt = VIDEO_PROMPTS[clip?.index]

  // Video auto-advance
  useEffect(() => {
    if (!isVideoPlaying) return
    const interval = setInterval(() => setCurrentVideoIndex(prev => (prev + 1) % VIDEO_CLIPS.length), 4500)
    return () => clearInterval(interval)
  }, [isVideoPlaying])

  // Keep the active thumbnail in view
  useEffect(() => {
    const strip = stripRef.current
    const el = strip?.querySelector<HTMLElement>(`[data-clip="${currentVideoIndex}"]`)
    if (strip && el) strip.scrollTo({ left: el.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' })
  }, [currentVideoIndex])

  // Parallax (mouse only)
  useEffect(() => {
    if (isTouch || reducedMotion) return
    const handleMouseMove = (e: MouseEvent) => {
      if (rootRef.current) {
        const rect = rootRef.current.getBoundingClientRect()
        setMousePosition({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height })
      }
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [isTouch, reducedMotion])

  // Random glitch
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      if (Math.random() < 0.1) {
        setIsGlitching(true)
        setTimeout(() => setIsGlitching(false), 150 + Math.random() * 200)
      }
    }, 3000)
    return () => clearInterval(glitchInterval)
  }, [])

  // Avatar flash on entry (only once consent is given)
  useEffect(() => {
    if (!consentGiven) return
    setShowAvatarFlash(true)
    const timer = setTimeout(() => setShowAvatarFlash(false), 1500)
    return () => clearTimeout(timer)
  }, [consentGiven])

  const identifyPerson = async () => {
    setIsIdentifying(true)
    setIdentification(null)
    setIdentifyError(null)
    setShowIdentify(true)
    try {
      const response = await gatedFetch('/api/identify', { method: 'POST', body: JSON.stringify({ asset: 'woman', lang }) })
      const data = await response.json()
      if (!response.ok || data.error) setIdentifyError(data.error || `HTTP ${response.status}`)
      else setIdentification(data)
    } catch (error) {
      setIdentifyError(String(error))
    } finally {
      setIsIdentifying(false)
    }
  }

  const px = isTouch ? 0 : (mousePosition.x - 0.5) * -40
  const py = isTouch ? 0 : (mousePosition.y - 0.5) * -30

  return (
    <motion.div ref={rootRef} key="incarnation" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="min-h-[100dvh] flex flex-col pb-[calc(var(--nav-h)+1rem)] relative">
      <AmbientBackground screenKey="incarnation" />

      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-bunker/20 relative z-20">
        <div className="flex items-center justify-between gap-2 mb-3">
          <button onClick={() => setScreen('explore')} className="flex items-center gap-2 font-mono text-xs text-bunker hover:text-flare transition-colors shrink-0">
            <span>←</span> <span className="hidden sm:inline">{t('common.back')}</span>
          </button>
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <div className="text-2xl sm:text-3xl text-flare" aria-hidden>
              ◈
            </div>
            <div className="min-w-0">
              <div className="font-mono text-[10px] text-flare">{t('incarnation.num')}</div>
              <div className="font-mono text-[11px] sm:text-xs text-bone/80 truncate">{t('incarnation.title')}</div>
            </div>
          </div>
          <button onClick={() => setIsVideoPlaying(!isVideoPlaying)} className={`px-2 sm:px-3 py-1 font-mono text-[10px] border transition-all shrink-0 ${isVideoPlaying ? 'border-flare text-flare' : 'border-bunker text-bunker'}`}>
            {isVideoPlaying ? '❚❚' : '▶'} {t('incarnation.auto')}
          </button>
        </div>
        <div className="text-center max-w-2xl mx-auto">
          <p className="font-mono text-[11px] sm:text-xs text-bone/70 mb-1 sm:mb-2">
            <RichText k="incarnation.explain1" />
          </p>
          <p className="font-mono text-[10px] text-bunker/80 hidden sm:block">
            <RichText k="incarnation.explain2" />
          </p>
        </div>
      </div>

      {/* Main video display */}
      <div className="flex-1 relative min-h-[46dvh] sm:min-h-[50vh] overflow-hidden bg-void">
        {/* Consent gate */}
        <AnimatePresence>
          {!consentGiven && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-void/80 backdrop-blur-xl">
              <div className="max-w-md w-full p-4 sm:p-6 border border-prismatic/40 bg-void/90">
                <div className="font-mono text-[10px] text-prismatic tracking-[0.3em] mb-2">{t('incarnation.consent.label')}</div>
                <p className="font-mono text-xs text-bone/80 leading-relaxed mb-4">{t('incarnation.consent.text')}</p>
                <button onClick={() => setConsentGiven(true)} className="w-full px-4 py-3 border border-prismatic text-prismatic hover:bg-prismatic/10 font-mono text-xs tracking-wider transition-all">
                  {t('incarnation.consent.button')}
                </button>
                <div className="font-mono text-[9px] text-bunker/60 mt-2 text-center">{t('incarnation.consent.blurred')}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Avatar Flash */}
        <AnimatePresence>
          {showAvatarFlash && (
            <motion.div className="absolute inset-0 z-30" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 1.5, times: [0, 0.1, 0.7, 1], ease: 'easeInOut' }}>
              <motion.div className="absolute inset-0" animate={{ x: px * 2, y: py * 2, scale: 1.15 }} transition={{ type: 'spring', stiffness: 50, damping: 30 }}>
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${AVATAR_IMAGE})`, backgroundPosition: 'center 20%', filter: 'saturate(0.9) contrast(1.2)' }} />
              </motion.div>
              <motion.div className="absolute inset-0 bg-bone/10" animate={{ opacity: [0.3, 0, 0] }} transition={{ duration: 0.3 }} />
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(5)].map((_, i) => (
                  <motion.div key={i} className="absolute left-0 right-0 h-px bg-flare/50" style={{ top: `${20 + i * 15}%` }} initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: [0, 1, 0], opacity: [0, 1, 0] }} transition={{ duration: 0.2, delay: 0.1 + i * 0.05 }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Glitch hint */}
        <AnimatePresence>
          {isGlitching && !showAvatarFlash && consentGiven && (
            <motion.div className="absolute inset-0 z-20" initial={{ opacity: 0 }} animate={{ opacity: 0.15 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${AVATAR_IMAGE})`, backgroundPosition: 'center 20%', filter: 'saturate(2) contrast(1.5) hue-rotate(20deg)', transform: `translate(${Math.random() * 10 - 5}px, ${Math.random() * 5 - 2.5}px) scale(1.15)` }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video with parallax */}
        <motion.div className="absolute inset-0" animate={{ x: px, y: py, scale: 1.1 }} transition={{ type: 'spring', stiffness: 80, damping: 25 }}>
          <video
            key={clip?.file}
            className={`absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen transition-[filter] duration-500 ${consentGiven ? '' : 'blur-2xl'}`}
            src={`/eon/${clip?.file}`}
            poster={clip?.thumb}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        </motion.div>

        <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-transparent pointer-events-none" />

        {/* Floating prompt composition (desktop) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden hidden md:block">
          <motion.div className="absolute top-20 right-8 max-w-sm text-right" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key={`prompt-${currentVideoIndex}`}>
            <div className="font-mono text-[9px] text-flare/40 mb-1">// stage7_prompts.json → clip_{clip?.index}</div>
            <p className="font-mono text-[11px] text-bone/30 leading-relaxed italic">&quot;{prompt?.description}&quot;</p>
            <div className="font-mono text-[8px] text-stratosphere/30 mt-2">{prompt?.sync_reference}</div>
          </motion.div>
          <motion.div className="absolute top-1/3 left-8 max-w-[220px]" animate={{ opacity: [0.15, 0.25, 0.15], y: [0, -5, 0] }} transition={{ duration: 8, repeat: Infinity }} key={`assets-${currentVideoIndex}`}>
            <div className="font-mono text-[8px] text-stratosphere/30 mb-1">{t('incarnation.assetsInScene')}</div>
            <div className="space-y-1">
              {prompt?.assets?.map((asset, i) => (
                <div key={i} className="font-mono text-[10px] text-bone/20">
                  → {asset}
                </div>
              ))}
            </div>
            <div className="font-mono text-[8px] text-flare/20 mt-2">{prompt?.scene_timerange}</div>
          </motion.div>
          <motion.div className="absolute bottom-32 left-1/2 -translate-x-1/2 text-center" animate={{ opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 6, repeat: Infinity }}>
            <div className="font-mono text-[10px] text-flare/20">DRAMATURGY[{Math.floor(currentVideoIndex / 10)}]</div>
            <div className="font-mono text-xs text-bone/15">{DRAMATURGY[Math.min(Math.floor(currentVideoIndex / 10), DRAMATURGY.length - 1)]?.event}</div>
          </motion.div>
          <motion.div className="absolute top-1/2 right-12 font-mono text-[8px] text-bunker/20" animate={{ opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 4, repeat: Infinity, delay: 1 }}>
            MODEL: kwaivgi/kling-v2.6
          </motion.div>
        </div>

        {/* Current clip info (all sizes) */}
        <div className="absolute bottom-3 left-3 z-10">
          <motion.div key={currentVideoIndex} initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} whileHover={{ opacity: 0.9 }} className="px-2 py-1.5 bg-void/40 backdrop-blur-sm border border-bunker/10 transition-opacity">
            <div className="flex items-center gap-2">
              <motion.div className="w-1.5 h-1.5 bg-flare/60" animate={{ opacity: [0.6, 0.2, 0.6] }} transition={{ duration: 2, repeat: Infinity }} />
              <div className="font-mono text-[9px] text-bunker/70">{clip?.file}</div>
              <div className="font-mono text-[8px] text-bunker/40">{t('incarnation.clipOf', { n: currentVideoIndex + 1, total: VIDEO_CLIPS.length })}</div>
            </div>
            <div className="mt-1 h-[2px] bg-bunker/10 overflow-hidden w-24">
              <motion.div className="h-full bg-flare/30" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 4.5, ease: 'linear' }} key={currentVideoIndex} />
            </div>
          </motion.div>
        </div>
        {/* Mobile: tap the video for details */}
        <button className="absolute inset-0 md:hidden" aria-label={clip?.file} onClick={() => consentGiven && setSelectedClip(clip)} />
      </div>

      {/* Timeline strip */}
      <div className="border-t border-bunker/20 bg-void/90 relative z-10">
        <div className="px-3 sm:px-4 py-2">
          <div className="font-mono text-[10px] text-bunker/50 mb-2">{t('incarnation.clipsHint', { count: VIDEO_CLIPS.length })}</div>
          <div ref={stripRef} className="flex h-16 sm:h-20 gap-1 overflow-x-auto overscroll-x-contain snap-x pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            {VIDEO_CLIPS.map((c, i) => (
              <button
                key={c.index}
                data-clip={i}
                onClick={() => {
                  setCurrentVideoIndex(i)
                  if (!isTouch) setSelectedClip(c)
                }}
                className={`flex-shrink-0 w-14 sm:w-16 h-full border overflow-hidden relative transition-all snap-center ${i === currentVideoIndex ? 'border-flare ring-1 ring-flare' : 'border-bunker/30 hover:border-flare/50'}`}
              >
                <div className={`absolute inset-0 bg-cover bg-center opacity-60 ${consentGiven ? '' : 'blur-md'}`} style={{ backgroundImage: `url(${c.thumb})` }} />
                <div className="absolute inset-0 bg-gradient-to-t from-void/90 via-transparent to-transparent" />
                <div className="absolute bottom-1 left-0 right-0 text-center">
                  <span className={`font-mono text-[9px] ${i === currentVideoIndex ? 'text-flare' : 'text-bone/70'}`}>{c.index.toString().padStart(3, '0')}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <Slot name="incarnationExtras" />

      {/* Action buttons */}
      <div className="p-3 sm:p-4 border-t border-bunker/20 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 relative z-10">
        <motion.button
          onClick={identifyPerson}
          disabled={isIdentifying || !consentGiven}
          whileTap={{ scale: 0.97 }}
          className="px-5 sm:px-8 py-3 sm:py-4 bg-flare hover:bg-flare/90 disabled:opacity-50 disabled:cursor-wait font-mono text-sm sm:text-base text-void font-bold transition-all flex items-center justify-center gap-3 shadow-lg shadow-flare/30"
          animate={{ boxShadow: isIdentifying ? '0 0 20px rgba(217,108,44,0.5)' : ['0 0 10px rgba(217,108,44,0.3)', '0 0 25px rgba(217,108,44,0.5)', '0 0 10px rgba(217,108,44,0.3)'] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {isIdentifying ? (
            <>
              <motion.div className="w-5 h-5 border-2 border-void border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
              {t('incarnation.identifying')}
            </>
          ) : (
            <>
              <span className="text-xl" aria-hidden>
                🔍
              </span>
              {t('incarnation.identify')}
            </>
          )}
        </motion.button>
        <button onClick={() => goToSection('exegesis')} className="px-5 sm:px-8 py-3 bg-prismatic hover:bg-prismatic/80 text-void font-mono text-xs sm:text-sm transition-all">
          {t('incarnation.askWhy')}
        </button>
      </div>

      {/* Clip detail modal */}
      <AnimatePresence>
        {selectedClip && (
          <Modal accent="flare" onClose={() => setSelectedClip(null)}>
            <ClipDetail clip={selectedClip} onClose={() => setSelectedClip(null)} />
          </Modal>
        )}
      </AnimatePresence>

      {/* Identification modal */}
      <AnimatePresence>
        {showIdentify && (
          <Modal accent="flare" onClose={() => !isIdentifying && setShowIdentify(false)} locked={isIdentifying}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="font-mono text-base sm:text-lg text-flare flex items-center gap-2">
                  <span aria-hidden>🔍</span> {t('incarnation.identifyModal.title')}
                </div>
                <div className="font-mono text-[10px] text-bunker/60 mt-1">{t('incarnation.identifyModal.model', { model: identification?.model ?? 'gemini-flash' })}</div>
              </div>
              {!isIdentifying && (
                <button onClick={() => setShowIdentify(false)} className="font-mono text-xs text-bunker hover:text-bone">
                  [{t('common.close')}]
                </button>
              )}
            </div>
            <div className="mb-4 p-3 border border-bunker/30 bg-bunker/10">
              <div className="font-mono text-[10px] text-bunker/60 mb-2">{t('incarnation.identifyModal.analyzing')}</div>
              <div className="font-mono text-[10px] text-stratosphere">{t('incarnation.identifyModal.query')}</div>
            </div>
            <div className="p-4 bg-void/50 border border-flare/30 min-h-[150px]">
              {isIdentifying ? (
                <div className="flex flex-col items-center justify-center h-32 gap-4">
                  <motion.div className="w-12 h-12 border-4 border-flare border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
                  <div className="font-mono text-sm text-flare">{t('incarnation.identifyModal.wait')}</div>
                  <div className="font-mono text-[10px] text-bunker/60 text-center">{t('incarnation.identifyModal.waitHint')}</div>
                </div>
              ) : identifyError ? (
                <p className="font-mono text-sm text-flare/90">{t('incarnation.identifyModal.error', { message: identifyError })}</p>
              ) : identification ? (
                <div>
                  <div className="font-mono text-[10px] text-flare mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-flare animate-pulse" />
                    {t('incarnation.identifyModal.response')}
                  </div>
                  <p className="font-mono text-sm text-bone/90 leading-relaxed whitespace-pre-wrap">{identification.response}</p>
                  {identification.tally?.total ? (
                    <p className="font-mono text-[10px] text-prismatic/80 mt-4 pt-3 border-t border-bunker/20">
                      {t('incarnation.identifyModal.tally', { recognised: identification.tally.recognised ?? 0, total: identification.tally.total })}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            {!isIdentifying && (identification || identifyError) && (
              <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="font-mono text-[10px] text-bunker/50">{t('incarnation.identifyModal.live')}</div>
                <button onClick={identifyPerson} className="px-4 py-2 border border-flare hover:bg-flare/20 font-mono text-xs text-flare transition-all">
                  {t('incarnation.identifyModal.again')}
                </button>
              </div>
            )}
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function ClipDetail({ clip, onClose }: { clip: Clip; onClose: () => void }) {
  const { t } = useI18n()
  const p = VIDEO_PROMPTS[clip.index]
  return (
    <>
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="font-mono text-base sm:text-lg text-flare">{clip.file}</div>
          <div className="font-mono text-[10px] text-bunker/60">{p?.sync_reference}</div>
        </div>
        <button onClick={onClose} className="font-mono text-xs text-bunker hover:text-bone">
          [{t('common.close')}]
        </button>
      </div>
      <video className="w-full aspect-video bg-void mb-4 border border-bunker/20" src={`/eon/${clip.file}`} poster={clip.thumb} controls autoPlay muted loop playsInline />
      <div className="font-mono text-[10px] text-stratosphere mb-2">{t('incarnation.modal.description')}</div>
      <div className="p-3 sm:p-4 bg-void/50 border border-bunker/20 mb-4">
        <p className="font-mono text-sm text-bone/80 leading-relaxed">{p?.description || t('incarnation.modal.noDescription')}</p>
      </div>
      <div className="font-mono text-[10px] text-flare mb-2">{t('incarnation.modal.prompt')}</div>
      <div className="p-3 sm:p-4 bg-void/50 border border-flare/20 mb-4">
        <p className="font-mono text-xs text-bone/70 leading-relaxed italic">&quot;{p?.positive_prompt || t('incarnation.modal.noPrompt')}&quot;</p>
      </div>
      <div className="grid grid-cols-2 gap-4 font-mono text-[10px]">
        <div>
          <div className="text-stratosphere mb-1">{t('incarnation.modal.assets')}</div>
          <div className="text-bunker/70">{p?.assets?.join(', ') || 'N/A'}</div>
        </div>
        <div>
          <div className="text-stratosphere mb-1">{t('incarnation.modal.timeline')}</div>
          <div className="text-bunker/70">{p?.scene_timerange || clip.timeRange}</div>
        </div>
        <div>
          <div className="text-stratosphere mb-1">{t('incarnation.modal.model')}</div>
          <div className="text-bunker/70">kwaivgi/kling-v2.6</div>
        </div>
        <div>
          <div className="text-stratosphere mb-1">{t('incarnation.modal.generated')}</div>
          <div className="text-bunker/70">08.01.2026</div>
        </div>
      </div>
    </>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLiturgy, type Screen } from '@/app/lib/LiturgyContext'
import { useI18n } from '@/app/lib/i18n/I18nProvider'
import { getAudioEngine } from '@/app/lib/audioEngine'

/**
 * The artist's cloned voice guiding the visitor through the panels.
 * Audio files: /voice/<lang>/<segment>.mp3 (+ optional <segment>.json with
 * ElevenLabs character alignment for karaoke subtitles). Missing language → English.
 */

export type VoiceSegment = 'entry' | 'hub' | 'genesis' | 'incarnation' | 'exegesis' | 'epilogue' | 'statement'

const SCREEN_SEGMENT: Partial<Record<Screen, VoiceSegment>> = {
  explore: 'hub',
  genesis: 'genesis',
  incarnation: 'incarnation',
  exegesis: 'exegesis',
}

interface Alignment {
  characters: string[]
  character_start_times_seconds: number[]
  character_end_times_seconds: number[]
}

// One reusable element, unlocked during the ENTER gesture (iOS autoplay policy).
let narratorEl: HTMLAudioElement | null = null
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA='

export function unlockNarrator() {
  if (typeof window === 'undefined') return
  if (!narratorEl) {
    narratorEl = new Audio()
    narratorEl.preload = 'auto'
    narratorEl.setAttribute('playsinline', 'true')
  }
  try {
    narratorEl.src = SILENT_WAV
    void narratorEl.play().catch(() => undefined)
  } catch {
    /* ignore */
  }
}

function getEl(): HTMLAudioElement {
  if (!narratorEl) unlockNarrator()
  return narratorEl!
}

/**
 * Imperative API for other features (auto-tour, voice ritual…).
 * Events emitted on window: 'liturgy:narrate-started' {segment, lang},
 * 'liturgy:narrate-ended' {segment, queued} (queued=true when another segment follows).
 */
export const narrator = {
  play(lang: string, segment: VoiceSegment) {
    window.dispatchEvent(new CustomEvent('liturgy:narrate', { detail: { lang, segment } }))
  },
  stop() {
    window.dispatchEvent(new CustomEvent('liturgy:narrate-stop'))
  },
  isPlaying(): boolean {
    return !!narratorEl && !narratorEl.paused && !narratorEl.ended && narratorEl.src !== SILENT_WAV
  },
}

export function Narrator() {
  const { screen, entered, narratorOn, setNarratorOn, isPlaying } = useLiturgy()
  const { lang, t, tOptional } = useI18n()
  const [current, setCurrent] = useState<VoiceSegment | null>(null)
  const [progress, setProgress] = useState(0)
  const [charIndex, setCharIndex] = useState(-1)
  const alignmentRef = useRef<Alignment | null>(null)
  const playedRef = useRef<Set<string>>(new Set())
  const visitedRef = useRef<Set<Screen>>(new Set())
  const queueRef = useRef<VoiceSegment[]>([])
  const langRef = useRef(lang)
  langRef.current = lang

  const stop = useCallback(() => {
    const el = getEl()
    el.pause()
    queueRef.current = []
    setCurrent(null)
    setCharIndex(-1)
    getAudioEngine().duck(1)
  }, [])

  const playSegment = useCallback(
    async (segment: VoiceSegment, useLang = langRef.current) => {
      const el = getEl()
      const tryLangs = [useLang, 'en'].filter((v, i, a) => a.indexOf(v) === i)
      for (const l of tryLangs) {
        const url = `/voice/${l}/${segment}.mp3`
        try {
          const head = await fetch(url, { method: 'HEAD' })
          if (!head.ok) continue
        } catch {
          continue
        }
        alignmentRef.current = null
        fetch(`/voice/${l}/${segment}.json`)
          .then(r => (r.ok ? r.json() : null))
          .then(j => {
            if (j && Array.isArray(j.characters)) alignmentRef.current = j as Alignment
          })
          .catch(() => undefined)
        el.src = url
        el.dataset.segment = segment
        el.currentTime = 0
        setCurrent(segment)
        setProgress(0)
        setCharIndex(-1)
        getAudioEngine().duck(0.3)
        try {
          await el.play()
          window.dispatchEvent(new CustomEvent('liturgy:narrate-started', { detail: { segment, lang: l } }))
          return true
        } catch {
          setCurrent(null)
          getAudioEngine().duck(1)
          return false
        }
      }
      return false
    },
    []
  )

  // Hook up element events once.
  useEffect(() => {
    const el = getEl()
    const onTime = () => {
      if (!el.duration) return
      setProgress(el.currentTime / el.duration)
      const al = alignmentRef.current
      if (al) {
        const tNow = el.currentTime
        let idx = -1
        for (let i = 0; i < al.character_start_times_seconds.length; i++) {
          if (al.character_start_times_seconds[i] <= tNow) idx = i
          else break
        }
        setCharIndex(idx)
      }
    }
    const onEnded = () => {
      const ended = el.dataset.segment
      setCurrent(null)
      setCharIndex(-1)
      const next = queueRef.current.shift()
      if (next) void playSegment(next)
      else getAudioEngine().duck(1)
      window.dispatchEvent(new CustomEvent('liturgy:narrate-ended', { detail: { segment: ended, queued: !!next } }))
    }
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('ended', onEnded)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('ended', onEnded)
    }
  }, [playSegment])

  // External control events.
  useEffect(() => {
    const onNarrate = (e: Event) => {
      const { lang: l, segment } = (e as CustomEvent).detail
      queueRef.current = []
      void playSegment(segment, l)
    }
    const onStop = () => stop()
    window.addEventListener('liturgy:narrate', onNarrate)
    window.addEventListener('liturgy:narrate-stop', onStop)
    return () => {
      window.removeEventListener('liturgy:narrate', onNarrate)
      window.removeEventListener('liturgy:narrate-stop', onStop)
    }
  }, [playSegment, stop])

  // Drive narration from screen changes (each segment once per visit, per language).
  useEffect(() => {
    if (!entered || !narratorOn) return
    const segment = SCREEN_SEGMENT[screen]
    if (!segment) return
    const firstHub = screen === 'explore' && !visitedRef.current.has('explore')
    const allPanelsSeen = ['genesis', 'incarnation', 'exegesis'].every(s => visitedRef.current.has(s as Screen))
    visitedRef.current.add(screen)

    // Epilogue once the visitor has seen all three panels and returns to the hub.
    if (screen === 'explore' && allPanelsSeen && !playedRef.current.has(`${lang}:epilogue`)) {
      playedRef.current.add(`${lang}:epilogue`)
      queueRef.current = []
      void playSegment('epilogue')
      return
    }

    const key = `${lang}:${segment}`
    if (playedRef.current.has(key)) return
    playedRef.current.add(key)

    if (firstHub) {
      // First arrival: intro, then the hub guidance.
      queueRef.current = ['hub']
      void playSegment('entry')
    } else {
      queueRef.current = []
      void playSegment(segment)
    }
  }, [screen, entered, narratorOn, lang, playSegment])

  // Toggling off stops immediately.
  useEffect(() => {
    if (!narratorOn) stop()
  }, [narratorOn, stop])

  // Pause narration when the visitor pauses the music.
  useEffect(() => {
    if (!isPlaying && current) getEl().pause()
    if (isPlaying && current) void getEl().play().catch(() => undefined)
  }, [isPlaying, current])

  const text = current ? tOptional(`voice.${current}`) ?? (current === 'statement' ? t('voice.statementTitle') : undefined) : undefined
  const alignment = alignmentRef.current
  const highlightUpTo = alignment && charIndex >= 0 ? alignment.characters.slice(0, charIndex + 1).join('').length : -1

  return (
    <>
      <AnimatePresence>
        {current && text && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed left-2 right-2 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[min(40rem,92vw)] z-40 bottom-[calc(var(--nav-h)+0.5rem)]"
            role="status"
            aria-live="polite"
          >
            <button onClick={stop} className="w-full text-left p-3 border border-flare/30 bg-void/90 backdrop-blur-md hover:border-flare/60 transition-colors">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 bg-flare animate-pulse" />
                <span className="font-mono text-[9px] text-flare tracking-[0.3em]">{t('common.narrator')} · P.LAZNIAK</span>
                <span className="ml-auto font-mono text-[9px] text-bunker/60">[×]</span>
              </div>
              <p className="font-display text-[15px] sm:text-base leading-snug text-bone/60">
                {highlightUpTo >= 0 ? (
                  <>
                    <span className="text-bone">{text.slice(0, highlightUpTo)}</span>
                    {text.slice(highlightUpTo)}
                  </>
                ) : (
                  <span className="text-bone/85">{text}</span>
                )}
              </p>
              <div className="mt-2 h-px bg-bunker/20">
                <div className="h-full bg-flare/60 transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <NarratorToggleRegistrar narratorOn={narratorOn} setNarratorOn={setNarratorOn} />
    </>
  )
}

// The toggle button itself lives in the bottom nav; this keeps the component self-contained.
function NarratorToggleRegistrar(_: { narratorOn: boolean; setNarratorOn: (v: boolean) => void }) {
  return null
}

export function NarratorToggle() {
  const { narratorOn, setNarratorOn } = useLiturgy()
  const { t } = useI18n()
  return (
    <button
      onClick={() => setNarratorOn(!narratorOn)}
      title={t('common.narratorHint')}
      aria-pressed={narratorOn}
      className={`h-9 px-2 sm:px-3 flex items-center gap-1.5 border font-mono text-[9px] sm:text-[10px] tracking-wider transition-all ${
        narratorOn ? 'border-flare/60 text-flare bg-flare/5' : 'border-bunker/30 text-bunker hover:text-bone'
      }`}
    >
      <span aria-hidden>{narratorOn ? '◉' : '○'}</span>
      <span className="hidden sm:inline">{t('common.narrator')}</span>
    </button>
  )
}

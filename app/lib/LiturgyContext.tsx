'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getAudioEngine, type AssemblageStage, type StemId } from './audioEngine'
import { ASSEMBLAGE_STAGES, AUDIO_DURATION, BACKGROUND_IMAGES, STEMS } from './constants'

export type Screen = 'landing' | 'explore' | 'genesis' | 'incarnation' | 'exegesis'
export const SCREENS: Screen[] = ['landing', 'explore', 'genesis', 'incarnation', 'exegesis']

const SCREEN_STAGE: Partial<Record<Screen, AssemblageStage>> = {
  explore: 'entry',
  genesis: 'genesis',
  incarnation: 'incarnation',
  exegesis: 'exegesis',
}

export interface LiturgyValue {
  screen: Screen
  setScreen: (s: Screen) => void
  goToSection: (s: Screen) => void
  entered: boolean
  /** Called from the ENTER button (user gesture). Loads audio, starts playback, opens the hub. */
  enter: () => Promise<void>
  loadingProgress: number // 0..100
  isAudioReady: boolean
  isPlaying: boolean
  toggleAudio: () => void
  currentTime: number
  duration: number
  currentStage: AssemblageStage
  setStage: (s: AssemblageStage) => void
  stemVolumes: Record<StemId, number>
  adjustStemVolume: (id: StemId, v: number) => void
  showMixer: boolean
  setShowMixer: (v: boolean) => void
  bgImages: Record<Screen, string>
  /** Narrator on/off (persisted). */
  narratorOn: boolean
  setNarratorOn: (v: boolean) => void
  /** Whether the visitor has acknowledged that the face was never requested (consent mode). */
  consentGiven: boolean
  setConsentGiven: (v: boolean) => void
  reducedMotion: boolean
  isTouch: boolean
}

const LiturgyContext = createContext<LiturgyValue | null>(null)

const NARRATOR_KEY = 'liturgy.narrator'
const CONSENT_KEY = 'liturgy.consent'

function readBool(key: string, fallback: boolean): boolean {
  try {
    const v = window.localStorage.getItem(key)
    return v === null ? fallback : v === '1'
  } catch {
    return fallback
  }
}

export function LiturgyProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreenState] = useState<Screen>('landing')
  const [entered, setEntered] = useState(false)
  const [currentStage, setCurrentStage] = useState<AssemblageStage>('entry')
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isAudioReady, setIsAudioReady] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [stemVolumes, setStemVolumes] = useState<Record<StemId, number>>(
    () => Object.fromEntries(STEMS.map(s => [s.id, 1])) as Record<StemId, number>
  )
  const [showMixer, setShowMixer] = useState(false)
  const [narratorOn, setNarratorOnState] = useState(true)
  const [consentGiven, setConsentGivenState] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [isTouch, setIsTouch] = useState(false)
  const [bgImages, setBgImages] = useState<Record<Screen, string>>({
    landing: '',
    explore: '',
    genesis: '',
    incarnation: '',
    exegesis: '',
  })
  const enteringRef = useRef(false)

  useEffect(() => {
    const shuffled = [...BACKGROUND_IMAGES].sort(() => Math.random() - 0.5)
    setBgImages({ landing: shuffled[0], explore: shuffled[1], genesis: shuffled[2], incarnation: shuffled[3], exegesis: shuffled[4] })
    setNarratorOnState(readBool(NARRATOR_KEY, true))
    setConsentGivenState(readBool(CONSENT_KEY, false))
    setReducedMotion(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
    setIsTouch((navigator.maxTouchPoints || 0) > 0)
  }, [])

  // Deep links: #genesis / #incarnation / #exegesis open that panel after ENTER.
  const setScreen = useCallback((s: Screen) => {
    setScreenState(s)
    try {
      const url = new URL(window.location.href)
      url.hash = s === 'landing' ? '' : s
      window.history.replaceState(null, '', url.toString())
    } catch {
      /* ignore */
    }
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const setStage = useCallback((s: AssemblageStage) => {
    getAudioEngine().setStage(s)
    setCurrentStage(s)
  }, [])

  const goToSection = useCallback(
    (s: Screen) => {
      setScreen(s)
      const stage = SCREEN_STAGE[s]
      if (stage && stage !== 'entry') setStage(stage)
    },
    [setScreen, setStage]
  )

  const enter = useCallback(async () => {
    if (enteringRef.current) return
    enteringRef.current = true
    const engine = getAudioEngine()
    try {
      if (!engine.isInitialized()) {
        await engine.initialize('/eon/audio', (loaded, total) => setLoadingProgress(Math.round((loaded / total) * 100)))
      }
      engine.setTimeUpdateCallback(setCurrentTime)
      setIsAudioReady(true)
      setLoadingProgress(100)
      engine.setStage('entry')
      await engine.play()
      setIsPlaying(true)
    } catch (e) {
      console.error('Audio init failed:', e)
    }
    setEntered(true)
    const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : ''
    if (hash === 'genesis' || hash === 'incarnation' || hash === 'exegesis') goToSection(hash)
    else setScreen('explore')
    enteringRef.current = false
  }, [goToSection, setScreen])

  const toggleAudio = useCallback(() => {
    const engine = getAudioEngine()
    engine.toggle()
    setIsPlaying(engine.getIsPlaying())
  }, [])

  const adjustStemVolume = useCallback((stemId: StemId, volume: number) => {
    getAudioEngine().setStemVolume(stemId, volume)
    setStemVolumes(prev => ({ ...prev, [stemId]: volume }))
  }, [])

  const setNarratorOn = useCallback((v: boolean) => {
    setNarratorOnState(v)
    try {
      window.localStorage.setItem(NARRATOR_KEY, v ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [])

  const setConsentGiven = useCallback((v: boolean) => {
    setConsentGivenState(v)
    try {
      window.localStorage.setItem(CONSENT_KEY, v ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo<LiturgyValue>(
    () => ({
      screen,
      setScreen,
      goToSection,
      entered,
      enter,
      loadingProgress,
      isAudioReady,
      isPlaying,
      toggleAudio,
      currentTime,
      duration: AUDIO_DURATION,
      currentStage,
      setStage,
      stemVolumes,
      adjustStemVolume,
      showMixer,
      setShowMixer,
      bgImages,
      narratorOn,
      setNarratorOn,
      consentGiven,
      setConsentGiven,
      reducedMotion,
      isTouch,
    }),
    [
      screen, setScreen, goToSection, entered, enter, loadingProgress, isAudioReady, isPlaying, toggleAudio, currentTime,
      currentStage, setStage, stemVolumes, adjustStemVolume, showMixer, bgImages, narratorOn, setNarratorOn, consentGiven,
      setConsentGiven, reducedMotion, isTouch,
    ]
  )

  return <LiturgyContext.Provider value={value}>{children}</LiturgyContext.Provider>
}

export function useLiturgy(): LiturgyValue {
  const ctx = useContext(LiturgyContext)
  if (!ctx) throw new Error('useLiturgy must be used inside <LiturgyProvider>')
  return ctx
}

export function stageLabelKey(stage: AssemblageStage): string {
  return `stages.${stage}`
}

export { ASSEMBLAGE_STAGES }

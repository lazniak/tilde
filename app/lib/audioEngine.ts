'use client'

import { STEMS, ASSEMBLAGE_STAGES } from './constants'

export type StemId = (typeof STEMS)[number]['id']
export type AssemblageStage = keyof typeof ASSEMBLAGE_STAGES

/**
 * Two playback modes, one interface:
 *
 *  - `buffer`  (desktop): every stem is fetched and decoded into an AudioBuffer.
 *                Sample-accurate sync and looping. Costs ~80 MB of RAM per stem
 *                once decoded, so it is off-limits for phones.
 *  - `stream`  (mobile / low-memory): every stem is an <audio> element streamed
 *                progressively and routed through the Web Audio graph via
 *                createMediaElementSource(). Memory stays flat, start is instant,
 *                drift is corrected by a watchdog every 2 s.
 *
 * Stage-based volume ramps and the per-stem mixer work identically in both modes.
 */
export type PlaybackMode = 'buffer' | 'stream'

interface StemTrack {
  id: StemId
  layer: number
  targetVolume: number
  gainNode: GainNode | null
  loaded: boolean
  // buffer mode
  buffer: AudioBuffer | null
  source: AudioBufferSourceNode | null
  // stream mode
  el: HTMLAudioElement | null
  mediaNode: MediaElementAudioSourceNode | null
}

const FALLBACK_DURATION = 213.68 // seconds; all stems share this length

export function detectPlaybackMode(): PlaybackMode {
  if (typeof navigator === 'undefined') return 'buffer'
  const ua = navigator.userAgent || ''
  const touch = (navigator.maxTouchPoints || 0) > 0
  const small = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 900px)').matches
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return 'stream'
  if (touch && small) return 'stream'
  if (typeof mem === 'number' && mem <= 4) return 'stream'
  return 'buffer'
}

type ProgressCb = (loaded: number, total: number) => void

class AudioEngine {
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private duckGain: GainNode | null = null
  private analyserNode: AnalyserNode | null = null
  private stems: Map<StemId, StemTrack> = new Map()
  private currentStage: AssemblageStage = 'entry'
  private isPlaying = false
  private masterVolume = 0.8
  private startTime = 0 // AudioContext time when playback started (buffer mode)
  private pausedAt = 0 // Position in audio when paused
  private onTimeUpdate: ((time: number) => void) | null = null
  private timeUpdateInterval: number | null = null
  private syncInterval: number | null = null
  private initialized = false
  private initPromise: Promise<void> | null = null
  private duration = 0
  private mode: PlaybackMode = 'buffer'
  private basePath = '/eon/audio'

  constructor() {
    STEMS.forEach(stem => {
      this.stems.set(stem.id, {
        id: stem.id,
        layer: stem.layer,
        targetVolume: 1,
        gainNode: null,
        loaded: false,
        buffer: null,
        source: null,
        el: null,
        mediaNode: null,
      })
    })
  }

  getMode(): PlaybackMode {
    return this.mode
  }

  /** Must be called from a user gesture (click/tap). Safe to call repeatedly. */
  async initialize(basePath = '/eon/audio', onProgress?: ProgressCb, mode?: PlaybackMode): Promise<void> {
    if (this.initialized) return
    if (this.initPromise) return this.initPromise
    this.initPromise = this.doInitialize(basePath, onProgress, mode).finally(() => {
      this.initPromise = null
    })
    return this.initPromise
  }

  private async doInitialize(basePath: string, onProgress?: ProgressCb, mode?: PlaybackMode) {
    this.basePath = basePath
    this.mode = mode ?? detectPlaybackMode()

    const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext) as typeof AudioContext
    this.audioContext = new Ctx()
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume().catch(() => undefined)
    }

    // master -> duck -> analyser -> destination
    this.masterGain = this.audioContext.createGain()
    this.masterGain.gain.value = this.masterVolume
    this.duckGain = this.audioContext.createGain()
    this.duckGain.gain.value = 1
    this.analyserNode = this.audioContext.createAnalyser()
    this.analyserNode.fftSize = 256
    this.analyserNode.smoothingTimeConstant = 0.8
    this.masterGain.connect(this.duckGain)
    this.duckGain.connect(this.analyserNode)
    this.analyserNode.connect(this.audioContext.destination)

    let loaded = 0
    const total = STEMS.length
    const report = () => onProgress?.(loaded, total)
    report()

    if (this.mode === 'stream') {
      // Create + unlock all elements synchronously while we are still inside the gesture.
      for (const stem of STEMS) {
        const track = this.stems.get(stem.id)!
        const el = new Audio()
        el.src = `${basePath}/${stem.file}`
        el.loop = true
        el.preload = 'auto'
        el.setAttribute('playsinline', 'true')
        const gainNode = this.audioContext.createGain()
        gainNode.gain.value = 0
        gainNode.connect(this.masterGain)
        const mediaNode = this.audioContext.createMediaElementSource(el)
        mediaNode.connect(gainNode)
        track.el = el
        track.gainNode = gainNode
        track.mediaNode = mediaNode
        // Unlock: iOS only honours play() issued during user activation.
        el.play().catch(() => undefined)
      }
      await Promise.all(
        STEMS.map(stem => {
          const track = this.stems.get(stem.id)!
          return this.waitCanPlay(track.el!).then(ok => {
            track.loaded = ok
            if (ok) loaded++
            if (ok && track.el!.duration && track.el!.duration > this.duration) this.duration = track.el!.duration
            report()
          })
        })
      )
      // Elements were started for unlocking; rewind so play() starts everything in sync.
      for (const [, track] of this.stems) {
        try {
          track.el?.pause()
          if (track.el) track.el.currentTime = 0
        } catch {
          /* ignore */
        }
      }
    } else {
      await Promise.all(
        STEMS.map(async stem => {
          const track = this.stems.get(stem.id)!
          try {
            const response = await fetch(`${basePath}/${stem.file}`)
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const arrayBuffer = await response.arrayBuffer()
            const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer)
            const gainNode = this.audioContext!.createGain()
            gainNode.gain.value = 0
            gainNode.connect(this.masterGain!)
            track.buffer = audioBuffer
            track.gainNode = gainNode
            track.loaded = true
            if (audioBuffer.duration > this.duration) this.duration = audioBuffer.duration
            loaded++
            report()
          } catch (error) {
            console.error(`✗ Failed to load ${stem.file}:`, error)
          }
        })
      )
    }

    if (!this.duration) this.duration = FALLBACK_DURATION
    this.initialized = true
    console.log(`Audio Engine [${this.mode}]: ${loaded}/${total} stems ready`)
  }

  private waitCanPlay(el: HTMLAudioElement, timeoutMs = 12000): Promise<boolean> {
    return new Promise(resolve => {
      if (el.readyState >= 3) return resolve(true)
      const done = (ok: boolean) => {
        el.removeEventListener('canplay', onOk)
        el.removeEventListener('canplaythrough', onOk)
        el.removeEventListener('error', onErr)
        clearTimeout(timer)
        resolve(ok)
      }
      const onOk = () => done(true)
      const onErr = () => done(false)
      const timer = setTimeout(() => done(el.readyState >= 2), timeoutMs)
      el.addEventListener('canplay', onOk)
      el.addEventListener('canplaythrough', onOk)
      el.addEventListener('error', onErr)
      el.load()
    })
  }

  setTimeUpdateCallback(callback: (time: number) => void): void {
    this.onTimeUpdate = callback
  }

  private startTimeUpdates(): void {
    if (this.timeUpdateInterval) return
    this.timeUpdateInterval = window.setInterval(() => {
      if (this.isPlaying) this.onTimeUpdate?.(this.getCurrentTime())
    }, 100)
  }

  private stopTimeUpdates(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval)
      this.timeUpdateInterval = null
    }
  }

  private masterElement(): HTMLAudioElement | null {
    for (const [, track] of this.stems) if (track.loaded && track.el) return track.el
    return null
  }

  private startSyncWatchdog(): void {
    if (this.syncInterval) return
    this.syncInterval = window.setInterval(() => {
      const master = this.masterElement()
      if (!master || !this.isPlaying) return
      const t = master.currentTime
      for (const [, track] of this.stems) {
        const el = track.el
        if (!el || el === master || !track.loaded) continue
        if (Math.abs(el.currentTime - t) > 0.08) {
          try {
            el.currentTime = t
          } catch {
            /* ignore */
          }
        }
        if (el.paused) el.play().catch(() => undefined)
      }
    }, 2000)
  }

  private stopSyncWatchdog(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  async play(): Promise<void> {
    if (!this.audioContext) await this.initialize()
    if (this.audioContext!.state === 'suspended') await this.audioContext!.resume()

    if (this.mode === 'stream') {
      const offset = this.pausedAt % this.duration
      const plays: Promise<void>[] = []
      for (const [, track] of this.stems) {
        if (!track.el || !track.loaded) continue
        try {
          track.el.currentTime = offset
        } catch {
          /* ignore */
        }
        plays.push(track.el.play().catch(() => undefined))
      }
      await Promise.all(plays)
      this.startSyncWatchdog()
    } else {
      this.stopAllSources()
      const contextStartTime = this.audioContext!.currentTime + 0.1
      this.startTime = contextStartTime
      for (const [, track] of this.stems) {
        if (track.buffer && track.gainNode) {
          const source = this.audioContext!.createBufferSource()
          source.buffer = track.buffer
          source.loop = true
          source.connect(track.gainNode)
          source.start(contextStartTime, this.pausedAt % this.duration)
          track.source = source
        }
      }
    }

    this.isPlaying = true
    this.updateVolumes()
    this.startTimeUpdates()
  }

  private stopAllSources(): void {
    for (const [, track] of this.stems) {
      if (track.source) {
        try {
          track.source.stop()
          track.source.disconnect()
        } catch {
          /* already stopped */
        }
        track.source = null
      }
    }
  }

  pause(): void {
    if (!this.isPlaying || !this.audioContext) return
    this.pausedAt = this.getCurrentTime()
    if (this.mode === 'stream') {
      this.stopSyncWatchdog()
      for (const [, track] of this.stems) track.el?.pause()
    } else {
      this.stopAllSources()
    }
    this.isPlaying = false
    this.stopTimeUpdates()
  }

  toggle(): void {
    if (this.isPlaying) this.pause()
    else void this.play()
  }

  setStage(stage: AssemblageStage): void {
    this.currentStage = stage
    this.updateVolumes()
  }

  private updateVolumes(): void {
    const activeLayers = [...ASSEMBLAGE_STAGES[this.currentStage].layers] as number[]
    const currentTime = this.audioContext?.currentTime || 0
    for (const [, track] of this.stems) {
      if (!track.gainNode) continue
      const isActive = activeLayers.includes(track.layer)
      const targetVolume = isActive ? track.targetVolume : 0
      track.gainNode.gain.cancelScheduledValues(currentTime)
      track.gainNode.gain.setValueAtTime(track.gainNode.gain.value, currentTime)
      track.gainNode.gain.linearRampToValueAtTime(targetVolume, currentTime + 1.2)
    }
  }

  setStemVolume(stemId: StemId, volume: number): void {
    const track = this.stems.get(stemId)
    if (track) {
      track.targetVolume = Math.max(0, Math.min(1, volume))
      this.updateVolumes()
    }
  }

  getStemVolume(stemId: StemId): number {
    return this.stems.get(stemId)?.targetVolume ?? 1
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume))
    if (this.masterGain && this.audioContext) {
      const t = this.audioContext.currentTime
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t)
      this.masterGain.gain.linearRampToValueAtTime(this.masterVolume, t + 0.1)
    }
  }

  /** Lower the music under a narrator voice (0..1, 1 = no ducking). */
  duck(level: number, seconds = 0.6): void {
    if (!this.duckGain || !this.audioContext) return
    const t = this.audioContext.currentTime
    this.duckGain.gain.cancelScheduledValues(t)
    this.duckGain.gain.setValueAtTime(this.duckGain.gain.value, t)
    this.duckGain.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, level)), t + seconds)
  }

  /** Frequency data for visualisers (values 0..255). Returns null before init. */
  getAnalyser(): AnalyserNode | null {
    return this.analyserNode
  }

  seek(time: number): void {
    const wasPlaying = this.isPlaying
    if (wasPlaying) this.pause()
    this.pausedAt = time % this.duration
    if (wasPlaying) void this.play()
  }

  getCurrentTime(): number {
    if (!this.audioContext || !this.isPlaying) return this.pausedAt
    if (this.mode === 'stream') {
      const master = this.masterElement()
      return master ? master.currentTime : this.pausedAt
    }
    return (this.audioContext.currentTime - this.startTime + this.pausedAt) % this.duration
  }

  getDuration(): number {
    return this.duration || FALLBACK_DURATION
  }

  getIsPlaying(): boolean {
    return this.isPlaying
  }

  getCurrentStage(): AssemblageStage {
    return this.currentStage
  }

  getActiveStemIds(): StemId[] {
    const activeLayers = [...ASSEMBLAGE_STAGES[this.currentStage].layers] as number[]
    return STEMS.filter(s => activeLayers.includes(s.layer)).map(s => s.id)
  }

  isInitialized(): boolean {
    return this.initialized
  }

  getLoadedStemsCount(): number {
    return Array.from(this.stems.values()).filter(t => t.loaded).length
  }

  destroy(): void {
    this.stopAllSources()
    this.stopTimeUpdates()
    this.stopSyncWatchdog()
    for (const [, track] of this.stems) {
      track.el?.pause()
      track.el = null
      track.mediaNode = null
      track.buffer = null
      track.gainNode = null
      track.source = null
      track.loaded = false
    }
    this.audioContext?.close()
    this.audioContext = null
    this.masterGain = null
    this.duckGain = null
    this.analyserNode = null
    this.initialized = false
  }
}

// Singleton instance
let audioEngineInstance: AudioEngine | null = null

export function getAudioEngine(): AudioEngine {
  if (!audioEngineInstance) audioEngineInstance = new AudioEngine()
  return audioEngineInstance
}

export { AudioEngine }

'use client'

import { STEMS, ASSEMBLAGE_STAGES } from './constants'

export type StemId = typeof STEMS[number]['id']
export type AssemblageStage = keyof typeof ASSEMBLAGE_STAGES

interface StemTrack {
  id: StemId
  buffer: AudioBuffer | null
  source: AudioBufferSourceNode | null
  gainNode: GainNode | null
  targetVolume: number
  layer: number
  loaded: boolean
}

class AudioEngine {
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private stems: Map<StemId, StemTrack> = new Map()
  private currentStage: AssemblageStage = 'entry'
  private isPlaying: boolean = false
  private masterVolume: number = 0.8
  private startTime: number = 0 // AudioContext time when playback started
  private pausedAt: number = 0  // Position in audio when paused
  private onTimeUpdate: ((time: number) => void) | null = null
  private timeUpdateInterval: number | null = null
  private initialized: boolean = false
  private duration: number = 0

  constructor() {
    // Initialize stem track states
    STEMS.forEach(stem => {
      this.stems.set(stem.id, {
        id: stem.id,
        buffer: null,
        source: null,
        gainNode: null,
        targetVolume: 1,
        layer: stem.layer,
        loaded: false,
      })
    })
  }

  async initialize(basePath: string = '/eon/STEAMS-music'): Promise<void> {
    if (this.initialized) return

    // Create AudioContext (must be created after user interaction)
    this.audioContext = new AudioContext()
    
    // Create master gain node
    this.masterGain = this.audioContext.createGain()
    this.masterGain.gain.value = this.masterVolume
    this.masterGain.connect(this.audioContext.destination)

    // Load all stems in parallel
    const loadPromises = STEMS.map(async (stem) => {
      const track = this.stems.get(stem.id)
      if (!track) return

      try {
        // Fetch audio file
        const response = await fetch(`${basePath}/${stem.file}`)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const arrayBuffer = await response.arrayBuffer()
        
        // Decode audio data
        const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer)
        
        // Create gain node for this stem
        const gainNode = this.audioContext!.createGain()
        gainNode.gain.value = 0 // Start muted
        gainNode.connect(this.masterGain!)
        
        track.buffer = audioBuffer
        track.gainNode = gainNode
        track.loaded = true

        // Track duration (use longest stem)
        if (audioBuffer.duration > this.duration) {
          this.duration = audioBuffer.duration
        }

        console.log(`✓ Loaded: ${stem.file} (${audioBuffer.duration.toFixed(1)}s)`)
      } catch (error) {
        console.error(`✗ Failed to load ${stem.file}:`, error)
      }
    })

    await Promise.all(loadPromises)
    
    const loadedCount = Array.from(this.stems.values()).filter(t => t.loaded).length
    console.log(`Audio Engine: ${loadedCount}/${STEMS.length} stems loaded`)
    
    this.initialized = true
  }

  setTimeUpdateCallback(callback: (time: number) => void): void {
    this.onTimeUpdate = callback
  }

  private startTimeUpdates(): void {
    if (this.timeUpdateInterval) return
    
    this.timeUpdateInterval = window.setInterval(() => {
      if (this.isPlaying && this.audioContext) {
        const currentTime = this.audioContext.currentTime - this.startTime + this.pausedAt
        // Loop the audio
        const loopedTime = currentTime % this.duration
        this.onTimeUpdate?.(loopedTime)
      }
    }, 50) // 20 FPS updates
  }

  private stopTimeUpdates(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval)
      this.timeUpdateInterval = null
    }
  }

  async play(): Promise<void> {
    if (!this.audioContext) {
      await this.initialize()
    }

    // Resume AudioContext if suspended (browser autoplay policy)
    if (this.audioContext!.state === 'suspended') {
      await this.audioContext!.resume()
    }

    // Stop any existing sources
    this.stopAllSources()

    // Calculate the exact start time for all stems
    const contextStartTime = this.audioContext!.currentTime + 0.1 // Small buffer for sync
    this.startTime = contextStartTime

    // Create and start all sources simultaneously
    for (const [, track] of this.stems) {
      if (track.buffer && track.gainNode) {
        // Create new source node
        const source = this.audioContext!.createBufferSource()
        source.buffer = track.buffer
        source.loop = true
        source.connect(track.gainNode)
        
        // Start at the exact same time with offset
        source.start(contextStartTime, this.pausedAt % this.duration)
        
        track.source = source
      }
    }

    this.isPlaying = true
    this.updateVolumes()
    this.startTimeUpdates()
    
    console.log(`▶ Playing from ${this.pausedAt.toFixed(1)}s (all ${this.stems.size} stems synchronized)`)
  }

  private stopAllSources(): void {
    for (const [, track] of this.stems) {
      if (track.source) {
        try {
          track.source.stop()
          track.source.disconnect()
        } catch {
          // Source may already be stopped
        }
        track.source = null
      }
    }
  }

  pause(): void {
    if (!this.isPlaying || !this.audioContext) return
    
    // Calculate current position
    this.pausedAt = (this.audioContext.currentTime - this.startTime + this.pausedAt) % this.duration
    
    this.stopAllSources()
    this.isPlaying = false
    this.stopTimeUpdates()
    
    console.log(`⏸ Paused at ${this.pausedAt.toFixed(1)}s`)
  }

  toggle(): void {
    if (this.isPlaying) {
      this.pause()
    } else {
      this.play()
    }
  }

  setStage(stage: AssemblageStage): void {
    this.currentStage = stage
    this.updateVolumes()
    console.log(`🎚 Stage: ${stage} → ${ASSEMBLAGE_STAGES[stage].label}`)
  }

  private updateVolumes(): void {
    const activeLayers = ASSEMBLAGE_STAGES[this.currentStage].layers

    for (const [, track] of this.stems) {
      if (!track.gainNode) continue

      const isActive = activeLayers.includes(track.layer)
      const targetVolume = isActive ? track.targetVolume : 0

      // Smooth volume transition using Web Audio API
      const currentTime = this.audioContext?.currentTime || 0
      track.gainNode.gain.cancelScheduledValues(currentTime)
      track.gainNode.gain.setValueAtTime(track.gainNode.gain.value, currentTime)
      track.gainNode.gain.linearRampToValueAtTime(targetVolume, currentTime + 1) // 1 second fade
    }
  }

  setStemVolume(stemId: StemId, volume: number): void {
    const track = this.stems.get(stemId)
    if (track) {
      track.targetVolume = Math.max(0, Math.min(1, volume))
      this.updateVolumes()
    }
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume))
    if (this.masterGain) {
      const currentTime = this.audioContext?.currentTime || 0
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, currentTime)
      this.masterGain.gain.linearRampToValueAtTime(volume, currentTime + 0.1)
    }
  }

  seek(time: number): void {
    const wasPlaying = this.isPlaying
    
    if (wasPlaying) {
      this.stopAllSources()
    }
    
    this.pausedAt = time % this.duration
    
    if (wasPlaying) {
      this.play()
    }
  }

  getCurrentTime(): number {
    if (!this.audioContext || !this.isPlaying) {
      return this.pausedAt
    }
    return (this.audioContext.currentTime - this.startTime + this.pausedAt) % this.duration
  }

  getDuration(): number {
    return this.duration
  }

  getIsPlaying(): boolean {
    return this.isPlaying
  }

  getCurrentStage(): AssemblageStage {
    return this.currentStage
  }

  getActiveStemIds(): StemId[] {
    const activeLayers = ASSEMBLAGE_STAGES[this.currentStage].layers
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
    
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    
    this.masterGain = null
    this.stems.forEach(track => {
      track.buffer = null
      track.gainNode = null
      track.source = null
    })
    
    this.initialized = false
    console.log('Audio Engine destroyed')
  }
}

// Singleton instance
let audioEngineInstance: AudioEngine | null = null

export function getAudioEngine(): AudioEngine {
  if (!audioEngineInstance) {
    audioEngineInstance = new AudioEngine()
  }
  return audioEngineInstance
}

export { AudioEngine }

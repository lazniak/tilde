'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { getAudioEngine } from '@/app/lib/audioEngine'
import { CuratorError, streamCurator } from '@/app/lib/curatorClient'
import { useI18n } from '@/app/lib/i18n/I18nProvider'
import { useLiturgy } from '@/app/lib/LiturgyContext'
import { NoiseReveal } from './NoiseReveal'
import { speechLang } from './speechLangs'

/* ------------------------------------------------------------------ *
 * Minimal typings for the Web Speech API (not in TypeScript's DOM lib)
 * ------------------------------------------------------------------ */

interface SpeechRecognitionAlternativeLike {
  transcript: string
}
interface SpeechRecognitionResultLike {
  readonly length: number
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternativeLike
}
interface SpeechRecognitionResultListLike {
  readonly length: number
  [index: number]: SpeechRecognitionResultLike
}
interface SpeechRecognitionEventLike {
  resultIndex: number
  results: SpeechRecognitionResultListLike
}
interface SpeechRecognitionErrorEventLike {
  error: string
}
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function recognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

/** Music level while the Curator speaks. */
const DUCK_LEVEL = 0.3
const MUTE_KEY = 'liturgy.curator.voiceMuted'

/**
 * Exegesis input slot: hold the button, speak, release. The transcript goes to the
 * Curator through the normal streaming endpoint; the answer is shown in a compact
 * bubble and read back with speechSynthesis while the music ducks.
 *
 * Renders nothing at all when SpeechRecognition is unavailable (Firefox, most of iOS).
 */
export function VoiceRitual() {
  const { t, lang } = useI18n()
  const { reducedMotion } = useLiturgy()

  const [supported, setSupported] = useState<boolean | null>(null)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [answer, setAnswer] = useState('')
  const [streamingDone, setStreamingDone] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const finalRef = useRef('')
  const interimRef = useRef('')
  const abortRef = useRef<AbortController | null>(null)
  const mutedRef = useRef(false)
  const speakingRef = useRef(false)

  mutedRef.current = muted

  // Capability probe + stored mute preference (client only, no hydration mismatch).
  useEffect(() => {
    setSupported(!!recognitionCtor())
    try {
      setMuted(window.localStorage.getItem(MUTE_KEY) === '1')
    } catch {
      /* storage may be unavailable */
    }
  }, [])

  const stopSpeaking = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    if (speakingRef.current) {
      speakingRef.current = false
      try {
        getAudioEngine().duck(1)
      } catch {
        /* audio engine not initialised yet */
      }
    }
  }, [])

  // Clean up on unmount: stop the stream, the microphone and the voice.
  useEffect(
    () => () => {
      abortRef.current?.abort()
      recognitionRef.current?.abort()
      stopSpeaking()
    },
    [stopSpeaking]
  )

  const speak = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis || mutedRef.current || !text.trim()) return
      const synth = window.speechSynthesis
      synth.cancel()
      const tag = speechLang(lang)
      const utter = new SpeechSynthesisUtterance(text)
      utter.lang = tag
      const base = tag.split('-')[0].toLowerCase()
      const voices = synth.getVoices()
      const match =
        voices.find(v => v.lang?.replace('_', '-').toLowerCase() === tag.toLowerCase()) ||
        voices.find(v => v.lang?.replace('_', '-').toLowerCase().startsWith(base))
      if (match) utter.voice = match
      utter.rate = 0.95
      utter.pitch = 0.95
      const restore = () => {
        speakingRef.current = false
        try {
          getAudioEngine().duck(1)
        } catch {
          /* ignore */
        }
      }
      utter.onend = restore
      utter.onerror = restore
      speakingRef.current = true
      try {
        getAudioEngine().duck(DUCK_LEVEL)
      } catch {
        /* ignore */
      }
      synth.speak(utter)
    },
    [lang]
  )

  const ask = useCallback(
    async (question: string) => {
      const message = question.trim()
      if (!message) return
      setBusy(true)
      setError(null)
      setAnswer('')
      setStreamingDone(false)
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const full = await streamCurator(message, [], lang, (_chunk, acc) => setAnswer(acc), controller.signal)
        setStreamingDone(true)
        if (full.trim()) speak(full)
        else setError(t('curator.voice.error.generic'))
      } catch (e) {
        setStreamingDone(true)
        if (e instanceof CuratorError) setError(e.message || t('curator.voice.error.generic'))
        else if ((e as Error).name !== 'AbortError') setError(t('curator.voice.error.generic'))
      } finally {
        setBusy(false)
        abortRef.current = null
      }
    },
    [lang, speak, t]
  )

  const startListening = useCallback(() => {
    const Ctor = recognitionCtor()
    if (!Ctor || listening) return
    stopSpeaking()
    setError(null)
    finalRef.current = ''
    interimRef.current = ''
    setTranscript('')

    let rec: SpeechRecognitionLike
    try {
      rec = new Ctor()
    } catch {
      setError(t('curator.voice.error.generic'))
      return
    }
    rec.lang = speechLang(lang)
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1

    rec.onstart = () => setListening(true)
    rec.onresult = e => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        const text = res[0]?.transcript ?? ''
        if (res.isFinal) finalRef.current += text
        else interim += text
      }
      interimRef.current = interim
      setTranscript((finalRef.current + ' ' + interim).trim())
    }
    rec.onerror = e => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setError(t('curator.voice.error.denied'))
      else if (e.error === 'no-speech') setError(t('curator.voice.error.nospeech'))
      else if (e.error !== 'aborted') setError(t('curator.voice.error.generic'))
    }
    rec.onend = () => {
      setListening(false)
      recognitionRef.current = null
      const said = (finalRef.current + ' ' + interimRef.current).trim()
      setTranscript(said)
      if (said) void ask(said)
    }

    recognitionRef.current = rec
    try {
      rec.start()
    } catch {
      // start() throws if a previous session is still winding down — ignore.
      recognitionRef.current = null
    }
  }, [ask, lang, listening, stopSpeaking, t])

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current
    if (!rec) return
    try {
      rec.stop()
    } catch {
      /* already stopped */
    }
  }, [])

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev
      try {
        window.localStorage.setItem(MUTE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      if (next) stopSpeaking()
      return next
    })
  }, [stopSpeaking])

  if (!supported) return null

  return (
    <div className="mb-4 border border-prismatic/20 bg-void/60 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <motion.button
          type="button"
          onPointerDown={e => {
            e.preventDefault()
            e.currentTarget.setPointerCapture?.(e.pointerId)
            startListening()
          }}
          onPointerUp={e => {
            e.currentTarget.releasePointerCapture?.(e.pointerId)
            stopListening()
          }}
          onPointerCancel={() => stopListening()}
          onContextMenu={e => e.preventDefault()}
          disabled={busy && !listening}
          style={{ touchAction: 'none' }}
          animate={
            listening && !reducedMotion
              ? { borderColor: ['rgba(224,255,255,0.4)', 'rgba(224,255,255,1)', 'rgba(224,255,255,0.4)'] }
              : {}
          }
          transition={{ duration: 1.2, repeat: Infinity }}
          className={`flex-1 min-h-[44px] px-4 py-3 border font-mono text-[11px] tracking-[0.25em] uppercase select-none transition-colors ${
            listening
              ? 'border-prismatic text-prismatic bg-prismatic/10'
              : 'border-bunker/40 text-bone/80 hover:border-prismatic hover:text-prismatic disabled:text-bunker/50 disabled:border-bunker/20'
          }`}
        >
          {listening ? t('curator.voice.listening') : t('curator.voice.hold')}
        </motion.button>

        <button
          type="button"
          onClick={toggleMute}
          aria-pressed={muted}
          title={muted ? t('curator.voice.unmute') : t('curator.voice.mute')}
          className="w-9 h-9 shrink-0 flex items-center justify-center border border-bunker/30 hover:border-prismatic font-mono text-[11px] text-bunker hover:text-prismatic transition-colors"
        >
          {muted ? '◌' : '◉'}
        </button>
      </div>

      <div className="font-mono text-[9px] text-bunker/50 mt-2">{t('curator.voice.hint')}</div>

      {transcript && (
        <div className="mt-3 p-3 border border-stratosphere/30 bg-stratosphere/10">
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-stratosphere/70 mb-1">
            {t('curator.voice.youSaid')}
          </div>
          <p className="font-mono text-[12px] text-bone/85 leading-relaxed" dir="auto">
            {transcript}
          </p>
        </div>
      )}

      {(busy || answer) && (
        <div className="mt-3 p-3 border border-prismatic/30 bg-void/80">
          <div className="font-mono text-[10px] text-prismatic/60 mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-prismatic animate-pulse" />
            {t('curator.voice.curator')}
          </div>
          {answer ? (
            <p className="font-mono text-[12px] sm:text-[13px] text-bone/90 whitespace-pre-wrap leading-relaxed">
              <NoiseReveal text={answer} done={streamingDone} />
            </p>
          ) : (
            <div className="flex items-center gap-2">
              {[0, 0.2, 0.4].map(d => (
                <motion.div
                  key={d}
                  className="w-2 h-2 bg-prismatic"
                  animate={reducedMotion ? { opacity: 0.6 } : { opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: d }}
                />
              ))}
              <span className="font-mono text-[10px] text-bunker/60 ml-2">{t('curator.voice.thinking')}</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 border border-flare/30 bg-flare/5 font-mono text-[11px] text-flare/90" role="status">
          {error}
        </div>
      )}
    </div>
  )
}

export default VoiceRitual

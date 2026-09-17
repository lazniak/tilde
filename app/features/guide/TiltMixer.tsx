'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLiturgy } from '@/app/lib/LiturgyContext'
import { useI18n } from '@/app/lib/i18n/I18nProvider'
import { STEMS } from '@/app/lib/constants'
import type { StemId } from '@/app/lib/audioEngine'

/**
 * Phone-only tilt mixer. DeviceOrientation drives the stem levels:
 *   gamma (roll, ±30°)  — left favours rhythm (drums/percussion/bass),
 *                         right favours harmony (synth/keyboard/other/backing);
 *                         the losing group drops to FLOOR.
 *   beta  (pitch, ±30°) — scales the voices (lead/guitar) between 0.2 and 1.
 *                         The resting angle is calibrated on the first reading,
 *                         so it works flat on a table or held up at 60°.
 *
 * Levels are lerped and pushed through adjustStemVolume at ~10 Hz, and only when
 * they actually moved (each call re-ramps the whole graph). Off restores every stem.
 */

const RHYTHM: StemId[] = ['drums', 'percussion', 'bass']
const HARMONY: StemId[] = ['synth', 'keyboard', 'other', 'backing']
const VOICES: StemId[] = ['lead', 'guitar']

const FLOOR = 0.35
const RANGE_DEG = 30
const TICK_MS = 100
const LERP = 0.25
const EPSILON = 0.02
const NO_EVENT_MS = 2500

type Status = 'idle' | 'denied' | 'unsupported'

interface OrientationCtor {
  requestPermission?: () => Promise<PermissionState | string>
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

export function TiltMixer() {
  const { isTouch, screen, adjustStemVolume } = useLiturgy()
  const { t } = useI18n()

  const [on, setOn] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [readout, setReadout] = useState({ balance: 0.5, voices: 1 })

  const rawRef = useRef<{ gamma: number; beta: number } | null>(null)
  const restBetaRef = useRef<number | null>(null)
  const smoothRef = useRef({ g: 0, b: 0 })
  const appliedRef = useRef<Partial<Record<StemId, number>>>({})
  const lastEventRef = useRef(0)
  const onRef = useRef(false)
  onRef.current = on

  const push = useCallback(
    (ids: StemId[], value: number) => {
      const v = clamp(value, 0, 1)
      for (const id of ids) {
        const prev = appliedRef.current[id]
        if (prev !== undefined && Math.abs(prev - v) < EPSILON) continue
        appliedRef.current[id] = v
        adjustStemVolume(id, v)
      }
    },
    [adjustStemVolume]
  )

  const restore = useCallback(() => {
    appliedRef.current = {}
    smoothRef.current = { g: 0, b: 0 }
    rawRef.current = null
    restBetaRef.current = null
    for (const stem of STEMS) adjustStemVolume(stem.id, 1)
    setReadout({ balance: 0.5, voices: 1 })
  }, [adjustStemVolume])

  const disable = useCallback(() => {
    setOn(false)
    restore()
  }, [restore])

  const enable = useCallback(async () => {
    if (typeof window === 'undefined') return
    const ctor = (window as unknown as { DeviceOrientationEvent?: OrientationCtor }).DeviceOrientationEvent
    if (!ctor) {
      setStatus('unsupported')
      return
    }
    const request = ctor.requestPermission
    if (typeof request === 'function') {
      // iOS 13+: must be called from inside the tap.
      try {
        const result = await request.call(ctor)
        if (result !== 'granted') {
          setStatus('denied')
          return
        }
      } catch {
        setStatus('denied')
        return
      }
    }
    rawRef.current = null
    restBetaRef.current = null
    smoothRef.current = { g: 0, b: 0 }
    appliedRef.current = {}
    lastEventRef.current = 0
    setStatus('idle')
    setOn(true)
  }, [])

  useEffect(() => {
    if (!on) return
    const armed = Date.now()

    const onOrient = (e: DeviceOrientationEvent) => {
      const { gamma, beta } = e
      if (gamma === null || beta === null || gamma === undefined || beta === undefined) return
      if (!Number.isFinite(gamma) || !Number.isFinite(beta)) return
      lastEventRef.current = Date.now()
      if (restBetaRef.current === null) restBetaRef.current = beta // calibrate at enable
      rawRef.current = { gamma, beta }
    }

    const tick = () => {
      if (!lastEventRef.current) {
        if (Date.now() - armed > NO_EVENT_MS) {
          setStatus('unsupported')
          setOn(false)
          restore()
        }
        return
      }
      const raw = rawRef.current
      if (!raw) return

      const rest = restBetaRef.current ?? 0
      const targetG = clamp(raw.gamma / RANGE_DEG, -1, 1)
      const targetB = clamp((raw.beta - rest) / RANGE_DEG, -1, 1)

      const s = smoothRef.current
      s.g += (targetG - s.g) * LERP
      s.b += (targetB - s.b) * LERP

      // Centre = everything at 1; the further you lean, the more the other side ducks.
      const rhythm = 1 - Math.max(0, s.g) * (1 - FLOOR)
      const harmony = 1 - Math.max(0, -s.g) * (1 - FLOOR)
      const voices = 0.2 + ((s.b + 1) / 2) * 0.8

      push(RHYTHM, rhythm)
      push(HARMONY, harmony)
      push(VOICES, voices)

      const balance = (s.g + 1) / 2
      setReadout(prev =>
        Math.abs(prev.balance - balance) > 0.01 || Math.abs(prev.voices - voices) > 0.01
          ? { balance, voices }
          : prev
      )
    }

    window.addEventListener('deviceorientation', onOrient)
    const iv = window.setInterval(tick, TICK_MS)
    return () => {
      window.removeEventListener('deviceorientation', onOrient)
      window.clearInterval(iv)
    }
  }, [on, push, restore])

  // Leaving the experience must not leave the mix skewed.
  useEffect(() => {
    return () => {
      if (onRef.current) restore()
    }
  }, [restore])

  useEffect(() => {
    if (screen === 'landing' && onRef.current) disable()
  }, [screen, disable])

  if (!isTouch || screen === 'landing') return null

  return (
    <div className="fixed top-14 right-3 z-40 flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => (on ? disable() : void enable())}
        aria-pressed={on}
        aria-label={on ? t('guide.tilt.off') : t('guide.tilt.on')}
        className={`h-9 px-2 flex items-center gap-1.5 border font-mono text-[9px] tracking-[0.2em] uppercase transition-all ${
          on ? 'border-flare/60 text-flare bg-flare/10' : 'border-bunker/40 text-bunker bg-void/80'
        }`}
      >
        <span aria-hidden>⟁</span>
        <span>{t('guide.tilt.label')}</span>
      </button>

      {on ? (
        <div className="w-[7.5rem] p-1.5 border border-flare/30 bg-void/85 flex flex-col gap-1.5" aria-hidden>
          <div>
            <div className="flex justify-between font-mono text-[7px] tracking-[0.15em] text-bunker/70">
              <span>{t('guide.tilt.rhythm')}</span>
              <span>{t('guide.tilt.harmony')}</span>
            </div>
            <div className="relative h-[3px] bg-bunker/20 mt-0.5">
              <div className="absolute inset-y-0 left-1/2 w-px bg-bunker/40" />
              <div
                className="absolute inset-y-0 bg-stratosphere"
                style={{
                  left: `${Math.min(readout.balance, 0.5) * 100}%`,
                  width: `${Math.abs(readout.balance - 0.5) * 100}%`,
                }}
              />
            </div>
          </div>
          <div>
            <div className="font-mono text-[7px] tracking-[0.15em] text-bunker/70">{t('guide.tilt.voices')}</div>
            <div className="relative h-[3px] bg-bunker/20 mt-0.5">
              <div className="absolute inset-y-0 left-0 bg-flare" style={{ width: `${readout.voices * 100}%` }} />
            </div>
          </div>
        </div>
      ) : null}

      {status !== 'idle' && !on ? (
        <p className="max-w-[10.5rem] p-1.5 border border-bunker/30 bg-void/85 font-mono text-[9px] leading-snug text-bunker/80 text-right">
          {t(status === 'denied' ? 'guide.tilt.denied' : 'guide.tilt.unsupported')}
        </p>
      ) : null}
    </div>
  )
}

export default TiltMixer

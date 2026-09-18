'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLiturgy, type Screen } from '@/app/lib/LiturgyContext'
import { useI18n } from '@/app/lib/i18n/I18nProvider'
import { narrator } from '@/app/components/Narrator'

/**
 * Auto-tour: hub → genesis → incarnation → exegesis → hub (epilogue).
 *
 * Each step navigates with goToSection() and then waits for the narrator:
 *   - 'liturgy:narrate-ended' with `queued: false` ends the step (plus a short tail);
 *     a queued segment means another one follows, so we keep waiting.
 *   - If no 'liturgy:narrate-started' shows up within NARRATE_GRACE_MS (no voice file,
 *     narrator off, already-played segment) we fall back to a timed dwell.
 *   - A 250 ms watchdog owns all of this, so a narration that dies without an 'ended'
 *     event (visitor pauses the music) can never wedge the tour.
 * Any pointer/wheel/touch/key interaction outside the tour button aborts immediately.
 */

const NARRATE_GRACE_MS = 2500
const DWELL_MS = 18000
const EPILOGUE_DWELL_MS = 12000
const TAIL_MS = 900
const MIN_STEP_MS = 4000
const MAX_STEP_MS = 90000
const STEP_GAP_MS = 400
const EPILOGUE_LEAD_MS = 700
const SCROLL_PX_PER_S = 40
const SCROLL_DELAY_MS = 1000
const INPUT_GRACE_MS = 350
const SILENCE_MS = 3000

interface TourStep {
  screen: Screen
  /** i18n key suffix under guide.tour.step.* */
  key: string
  dwell: number
  /** The closing return to the hub; not counted in "n of N". */
  coda?: boolean
}

const TOUR_STEPS: TourStep[] = [
  { screen: 'explore', key: 'hub', dwell: DWELL_MS },
  { screen: 'genesis', key: 'genesis', dwell: DWELL_MS },
  { screen: 'incarnation', key: 'incarnation', dwell: DWELL_MS },
  { screen: 'exegesis', key: 'exegesis', dwell: DWELL_MS },
  { screen: 'explore', key: 'epilogue', dwell: EPILOGUE_DWELL_MS, coda: true },
]

const COUNTED = TOUR_STEPS.filter(s => !s.coda).length

/** Cancellation token. `wake` lets stop() resolve whatever the runner is awaiting. */
interface Token {
  cancelled: boolean
  wake: (() => void) | null
}

function sleep(ms: number, token: Token): Promise<void> {
  return new Promise<void>(resolve => {
    const done = () => {
      window.clearTimeout(timer)
      if (token.wake === done) token.wake = null
      resolve()
    }
    const timer = window.setTimeout(done, ms)
    token.wake = done
    if (token.cancelled) done()
  })
}

/** Resolves when the current step is over (narration finished, dwell elapsed, or cancelled). */
function waitForStep(token: Token, dwell: number, expectVoice: boolean): Promise<void> {
  return new Promise<void>(resolve => {
    const t0 = Date.now()
    let done = false
    let started = false
    let endedAt = 0
    let lastSpeaking = 0
    let dwellDeadline = expectVoice ? 0 : t0 + dwell
    let watch = 0

    const settle = () => {
      if (done) return
      done = true
      window.clearInterval(watch)
      window.removeEventListener('liturgy:narrate-started', onStarted)
      window.removeEventListener('liturgy:narrate-ended', onEnded)
      if (token.wake === settle) token.wake = null
      resolve()
    }

    // Never leave a panel after a blink — a stale 'ended' from the previous segment
    // must not cut the new one short.
    const finish = () => {
      if (done) return
      if (Date.now() - t0 < MIN_STEP_MS) return // the watchdog retries
      settle()
    }

    function onStarted() {
      started = true
      endedAt = 0
      dwellDeadline = 0
      lastSpeaking = Date.now()
    }

    function onEnded(e: Event) {
      const detail = (e as CustomEvent<{ segment?: string; queued?: boolean }>).detail
      if (detail && detail.queued) {
        lastSpeaking = Date.now()
        return // another segment follows
      }
      endedAt = Date.now()
    }

    window.addEventListener('liturgy:narrate-started', onStarted)
    window.addEventListener('liturgy:narrate-ended', onEnded)

    watch = window.setInterval(() => {
      if (done) return
      const now = Date.now()
      const elapsed = now - t0
      let speaking = false
      try {
        speaking = narrator.isPlaying()
      } catch {
        speaking = false
      }
      if (speaking) {
        lastSpeaking = now
        endedAt = 0
      }

      if (elapsed >= MAX_STEP_MS) {
        settle()
        return
      }
      if (endedAt && now - endedAt >= TAIL_MS) {
        finish()
        return
      }
      if (!started && !speaking && !dwellDeadline && elapsed >= NARRATE_GRACE_MS) {
        // No voice arrived in time — dwell instead.
        dwellDeadline = now + dwell
        return
      }
      if (dwellDeadline && now >= dwellDeadline && !speaking) {
        finish()
        return
      }
      if (started && !speaking && !endedAt && lastSpeaking && now - lastSpeaking > SILENCE_MS) {
        // Narration was interrupted without an 'ended' event.
        finish()
      }
    }, 250)

    token.wake = settle
    if (token.cancelled) settle()
  })
}

/**
 * The bottom nav renders its audio cluster twice (one row for phones, one for desktop),
 * so this component is mounted twice and only the visible copy is ever clicked. If the
 * viewport crosses the sm breakpoint mid-tour the other copy becomes clickable, so a
 * module-level latch makes a second start stop the first instead of running two tours.
 */
let activeStop: (() => void) | null = null

export function TourButton() {
  const { goToSection, narratorOn, reducedMotion } = useLiturgy()
  const { lang, t } = useI18n()

  const [index, setIndex] = useState(-1)
  const [mounted, setMounted] = useState(false)
  const running = index >= 0

  const ctx = useRef({ goToSection, narratorOn, reducedMotion, lang })
  ctx.current = { goToSection, narratorOn, reducedMotion, lang }

  const tokenRef = useRef<Token | null>(null)
  const scrollRaf = useRef(0)
  const scrollTimer = useRef(0)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const stopRef = useRef<(() => void) | null>(null)

  useEffect(() => setMounted(true), [])

  const stopScroll = useCallback(() => {
    if (scrollRaf.current) window.cancelAnimationFrame(scrollRaf.current)
    if (scrollTimer.current) window.clearTimeout(scrollTimer.current)
    scrollRaf.current = 0
    scrollTimer.current = 0
  }, [])

  const stop = useCallback(() => {
    const token = tokenRef.current
    tokenRef.current = null
    stopScroll()
    if (activeStop === stopRef.current) activeStop = null
    if (token) {
      token.cancelled = true
      const wake = token.wake
      token.wake = null
      try {
        wake?.()
      } catch {
        /* ignore */
      }
    }
    setIndex(-1)
  }, [stopScroll])
  stopRef.current = stop

  /** Slow drift down the panel so the visitor actually sees it. */
  const startScroll = useCallback(
    (token: Token) => {
      stopScroll()
      if (ctx.current.reducedMotion) return
      // goToSection() smooth-scrolls to the top first; let that land.
      scrollTimer.current = window.setTimeout(() => {
        scrollTimer.current = 0
        if (token.cancelled) return
        let last = performance.now()
        let pos = window.scrollY
        const frame = (now: number) => {
          scrollRaf.current = 0
          if (token.cancelled) return
          const dt = Math.min(0.1, (now - last) / 1000)
          last = now
          const max = Math.max(0, (document.documentElement.scrollHeight || 0) - window.innerHeight)
          pos = Math.min(max, pos + SCROLL_PX_PER_S * dt)
          window.scrollTo(0, pos)
          if (pos >= max - 0.5) return // bottom reached, stop
          scrollRaf.current = window.requestAnimationFrame(frame)
        }
        scrollRaf.current = window.requestAnimationFrame(frame)
      }, SCROLL_DELAY_MS)
    },
    [stopScroll]
  )

  const run = useCallback(
    async (token: Token) => {
      try {
        for (let i = 0; i < TOUR_STEPS.length; i++) {
          if (token.cancelled) return
          const step = TOUR_STEPS[i]
          setIndex(i)
          ctx.current.goToSection(step.screen)

          if (step.coda && ctx.current.narratorOn) {
            await sleep(EPILOGUE_LEAD_MS, token)
            if (token.cancelled) return
            try {
              narrator.play(ctx.current.lang, 'epilogue')
            } catch {
              /* narrator not mounted — the dwell fallback covers it */
            }
          }

          startScroll(token)
          await waitForStep(token, step.dwell, ctx.current.narratorOn)
          stopScroll()
          if (token.cancelled) return
          if (i < TOUR_STEPS.length - 1) await sleep(STEP_GAP_MS, token)
        }
      } finally {
        stopScroll()
        if (tokenRef.current === token) {
          tokenRef.current = null
          if (activeStop === stopRef.current) activeStop = null
          setIndex(-1)
        }
      }
    },
    [startScroll, stopScroll]
  )

  const start = useCallback(() => {
    if (tokenRef.current) return
    if (activeStop && activeStop !== stopRef.current) activeStop()
    activeStop = stopRef.current
    const token: Token = { cancelled: false, wake: null }
    tokenRef.current = token
    setIndex(0)
    void run(token)
  }, [run])

  // Any interaction by the visitor takes the wheel back.
  useEffect(() => {
    if (!running) return
    const since = Date.now()
    const onInteract = (e: Event) => {
      if (Date.now() - since < INPUT_GRACE_MS) return
      const target = e.target as Node | null
      if (target && btnRef.current && btnRef.current.contains(target)) return // our own button
      stop()
    }
    const passive: AddEventListenerOptions = { passive: true, capture: true }
    window.addEventListener('pointerdown', onInteract, passive)
    window.addEventListener('wheel', onInteract, passive)
    window.addEventListener('touchstart', onInteract, passive)
    window.addEventListener('keydown', onInteract, true)
    return () => {
      window.removeEventListener('pointerdown', onInteract, passive)
      window.removeEventListener('wheel', onInteract, passive)
      window.removeEventListener('touchstart', onInteract, passive)
      window.removeEventListener('keydown', onInteract, true)
    }
  }, [running, stop])

  useEffect(() => stop, [stop])

  const step = running ? TOUR_STEPS[index] : null

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => (running ? stop() : start())}
        aria-pressed={running}
        aria-label={running ? t('guide.tour.stop') : t('guide.tour.start')}
        title={running ? t('guide.tour.stop') : t('guide.tour.hint')}
        className={`h-9 px-2 xl:px-3 flex items-center gap-1.5 border font-mono text-[9px] sm:text-[10px] tracking-wider transition-all ${
          running
            ? 'border-prismatic/60 text-prismatic bg-prismatic/5'
            : 'border-bunker/30 text-bunker hover:text-bone hover:border-bone'
        }`}
      >
        <span aria-hidden>{running ? '■' : '▷'}</span>
        <span className="hidden xl:inline">{t('guide.tour.label')}</span>
      </button>

      {mounted && step
        ? createPortal(
            <div
              className="fixed right-2 bottom-[calc(var(--nav-h)+0.4rem)] z-[60] pointer-events-none"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-1.5 px-2 py-1 border border-prismatic/40 bg-void/90 backdrop-blur-sm font-mono text-[9px] tracking-[0.2em] uppercase text-prismatic">
                <span aria-hidden className="animate-pulse">
                  ◉
                </span>
                <span>
                  {t('guide.tour.indicator', {
                    label: t(`guide.tour.step.${step.key}`),
                    step: Math.min(index + 1, COUNTED),
                    total: COUNTED,
                  })}
                </span>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}

export default TourButton

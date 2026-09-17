'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiturgy } from '@/app/lib/LiturgyContext'

/**
 * Streaming text that condenses out of latent noise.
 *
 * The growing edge of `text` (the last ~NOISE_WINDOW characters) is rendered as
 * shimmering glyphs; everything behind the front is the real, stable text. When
 * `done` flips to true the remaining noise drains within ~RESOLVE_MS.
 *
 * Cost: one interval and two slices per tick — no per-character state or elements.
 */

const GLYPHS = '▓▒░◇◈◆∞∂∫√≈'

/** How many characters at the growing edge stay unresolved. */
const NOISE_WINDOW = 24
/** How long a single character spends as noise before it settles. */
const RESOLVE_MS = 120
/** Shimmer/advance tick. Staggering comes from the front sweeping through the window. */
const TICK_MS = 45
/** Characters settled per millisecond — the whole window drains in RESOLVE_MS. */
const RATE = NOISE_WINDOW / RESOLVE_MS

/**
 * Replace a slice with glyphs. Whitespace is preserved so line breaks and word
 * shapes do not jump around while the tail shimmers. Deterministic per (index, seed)
 * so there is no Math.random() churn and no hydration surprise.
 */
function noisify(source: string, seed: number): string {
  let out = ''
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]
    if (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t') {
      out += ch
      continue
    }
    out += GLYPHS[(i * 7 + seed * 3 + ch.charCodeAt(0)) % GLYPHS.length]
  }
  return out
}

export interface NoiseRevealProps {
  /** The text as it has arrived so far. */
  text: string
  /** True once the stream is complete; the tail then resolves to the end. */
  done: boolean
  className?: string
}

export function NoiseReveal({ text, done, className }: NoiseRevealProps) {
  const { reducedMotion } = useLiturgy()
  const [frame, setFrame] = useState(0)
  const revealedRef = useRef(0)
  const textRef = useRef(text)
  const doneRef = useRef(done)

  textRef.current = text
  doneRef.current = done

  useEffect(() => {
    if (reducedMotion) return
    let last = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const id = window.setInterval(() => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
      const dt = now - last
      last = now
      const current = textRef.current
      const target = doneRef.current ? current.length : Math.max(0, current.length - NOISE_WINDOW)
      const prev = revealedRef.current
      revealedRef.current = Math.min(target, prev + dt * RATE)
      // Fully settled and nothing moved: skip the render entirely.
      if (revealedRef.current >= current.length && prev >= current.length) return
      setFrame(f => (f + 1) % 4096)
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [reducedMotion])

  const settled = reducedMotion ? text.length : Math.min(Math.floor(revealedRef.current), text.length)
  const head = text.slice(0, settled)
  const tail = text.slice(settled)
  const noise = useMemo(() => (tail ? noisify(tail, frame) : ''), [tail, frame])

  // `dir="auto"` lets the browser resolve RTL from the content itself; we never reorder.
  if (reducedMotion) {
    return (
      <span dir="auto" className={className}>
        {text}
      </span>
    )
  }

  return (
    <span dir="auto" className={className}>
      {head}
      {noise ? <span className="text-prismatic/60">{noise}</span> : null}
    </span>
  )
}

export default NoiseReveal

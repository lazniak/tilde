'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLiturgy } from '@/app/lib/LiturgyContext'
import { useI18n } from '@/app/lib/i18n/I18nProvider'
import { AVATAR_IMAGE } from '@/app/lib/constants'

/**
 * EMERGENCE — noise → face.
 *
 * The visitor drags the diffusion backwards. At 0 the canvas is pure seeded
 * noise at a 24 px block size; as t grows the noise mix falls away and the
 * ordered-dither block size shrinks to a single pixel, so the face resolves out
 * of the grain the way the model produced it in the first place.
 *
 * While consent has not been given, t is clamped to 0.35 — far enough to see a
 * silhouette, not far enough to see her.
 */

const SOURCE_MAX_W = 320
const MAX_STEP = 24
const CONSENT_CLAMP = 0.35

/** 4×4 Bayer matrix, scaled to 0…1. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16)

/** Stable per-pixel noise so the grain never flickers between frames. */
function seededNoise(width: number, height: number): Uint8Array {
  const out = new Uint8Array(width * height)
  let seed = 0x9e3779b9
  for (let i = 0; i < out.length; i++) {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    seed >>>= 0
    out[i] = seed & 0xff
  }
  return out
}

export function EmergenceSlider() {
  const { consentGiven, reducedMotion } = useLiturgy()
  const { t } = useI18n()

  const [value, setValue] = useState(0)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const sourceRef = useRef<{ data: Uint8ClampedArray; w: number; h: number; noise: Uint8Array } | null>(null)
  const scratchRef = useRef<ImageData | null>(null)
  const rafRef = useRef<number | null>(null)
  const pendingRef = useRef(0)

  const maxValue = consentGiven ? 100 : Math.round(CONSENT_CLAMP * 100)
  const effective = Math.min(value, maxValue)

  // ---- load the source once, at a small working resolution --------------
  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (cancelled) return
      try {
        const w = Math.min(SOURCE_MAX_W, img.naturalWidth || SOURCE_MAX_W)
        const h = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * w))
        const off = document.createElement('canvas')
        off.width = w
        off.height = h
        const ctx = off.getContext('2d', { willReadFrequently: true })
        if (!ctx) throw new Error('no 2d context')
        ctx.drawImage(img, 0, 0, w, h)
        sourceRef.current = { data: ctx.getImageData(0, 0, w, h).data, w, h, noise: seededNoise(w, h) }
        const canvas = canvasRef.current
        if (canvas) {
          canvas.width = w
          canvas.height = h
        }
        setReady(true)
      } catch {
        setFailed(true)
      }
    }
    img.onerror = () => !cancelled && setFailed(true)
    img.src = AVATAR_IMAGE
    return () => {
      cancelled = true
    }
  }, [])

  // ---- render ------------------------------------------------------------
  const paint = useCallback((t01: number) => {
    const src = sourceRef.current
    const canvas = canvasRef.current
    if (!src || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { w, h, data, noise } = src
    if (!scratchRef.current || scratchRef.current.width !== w) scratchRef.current = ctx.createImageData(w, h)
    const out = scratchRef.current.data

    // Block size falls from 24 px to 1 px; the mix goes from all-noise to all-face.
    const step = Math.max(1, Math.round(MAX_STEP - (MAX_STEP - 1) * t01))
    // Quantisation opens up quadratically so that 100 % really is the source asset
    // (256 levels, dither amplitude 1) rather than a posterised approximation of it.
    const levels = Math.round(2 + t01 * t01 * 254)
    const faceAmount = t01
    const noiseAmount = 1 - t01

    for (let by = 0; by < h; by += step) {
      for (let bx = 0; bx < w; bx += step) {
        // Average the colour over the block so large steps read as true pixelation…
        let r = 0
        let g = 0
        let b = 0
        let count = 0
        const yMax = Math.min(by + step, h)
        const xMax = Math.min(bx + step, w)
        for (let y = by; y < yMax; y++) {
          for (let x = bx; x < xMax; x++) {
            const i = (y * w + x) * 4
            r += data[i]
            g += data[i + 1]
            b += data[i + 2]
            count++
          }
        }
        r /= count
        g /= count
        b /= count
        // …but sample the noise once per block. Averaging it would wash the grain
        // out to a flat mid-grey exactly where the picture is supposed to be pure noise.
        const n = noise[by * w + bx]

        // Index the dither matrix by block, not by pixel: at step ≥ 4 the block
        // origins are all multiples of 4 and would land on the same matrix cell.
        const dither = (BAYER[(Math.floor(by / step) % 4) * 4 + (Math.floor(bx / step) % 4)] - 0.5) * (255 / levels)
        const mix = (channel: number) => {
          const v = channel * faceAmount + n * noiseAmount + dither
          const q = Math.round((v / 255) * (levels - 1)) / (levels - 1)
          return Math.max(0, Math.min(255, q * 255))
        }
        const rr = mix(r)
        const gg = mix(g)
        const bb = mix(b)

        for (let y = by; y < yMax; y++) {
          for (let x = bx; x < xMax; x++) {
            const i = (y * w + x) * 4
            out[i] = rr
            out[i + 1] = gg
            out[i + 2] = bb
            out[i + 3] = 255
          }
        }
      }
    }
    ctx.putImageData(scratchRef.current, 0, 0)
  }, [])

  const schedule = useCallback(
    (t01: number) => {
      pendingRef.current = t01
      if (rafRef.current !== null) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        paint(pendingRef.current)
      })
    },
    [paint]
  )

  useEffect(() => {
    if (ready) schedule(effective / 100)
  }, [ready, effective, schedule])

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    },
    []
  )

  // ---- pointer-draggable track ------------------------------------------
  const setFromPointer = useCallback(
    (clientX: number) => {
      const el = trackRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const ratio = (clientX - rect.left) / rect.width
      setValue(Math.round(Math.max(0, Math.min(1, ratio)) * 100))
    },
    []
  )

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    setFromPointer(e.clientX)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.buttons === 0) return
    setFromPointer(e.clientX)
  }

  const clamped = value > maxValue

  return (
    <section className="mx-3 sm:mx-4 mt-4 border border-flare/30 bg-flare/5">
      <div className="px-3 sm:px-4 py-3">
        <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-flare mb-1">{t('archaeology.emergence.label')}</div>
        <p className="font-mono text-[11px] text-bone/70 leading-relaxed mb-3">{t('archaeology.emergence.intro')}</p>

        <div className="relative w-full max-w-[480px] mx-auto border border-bunker/30 bg-void">
          <canvas
            ref={canvasRef}
            className="block w-full h-auto"
            style={{ imageRendering: 'pixelated' }}
            aria-label={t('archaeology.emergence.canvasLabel', { percent: effective })}
            role="img"
          />
          {!ready && !failed && (
            <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] text-bunker/70">
              {t('archaeology.common.loading')}
            </div>
          )}
          {failed && (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-center font-mono text-[10px] text-bunker/70">
              {t('archaeology.emergence.failed')}
            </div>
          )}
          {!consentGiven && ready && (
            <div className="absolute inset-x-0 bottom-0 p-2 bg-void/85 border-t border-prismatic/30">
              <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-prismatic text-center">
                {t('archaeology.emergence.withheld')}
              </div>
            </div>
          )}
        </div>

        {/* house-style track; the real <input> stays for keyboard + AT users */}
        <div className="max-w-[480px] mx-auto mt-3">
          <div
            ref={trackRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            className="relative h-9 border border-bunker/40 bg-void/60 cursor-ew-resize touch-none select-none"
            style={{ touchAction: 'none' }}
            aria-hidden
          >
            <div
              className={`absolute inset-y-0 left-0 bg-flare/20 ${reducedMotion ? '' : 'transition-[width] duration-75'}`}
              style={{ width: `${effective}%` }}
            />
            <div className="absolute inset-y-0 w-0.5 bg-flare" style={{ left: `calc(${effective}% - 1px)` }} />
            {clamped && <div className="absolute inset-y-0 border-l border-dashed border-prismatic/60" style={{ left: `${maxValue}%` }} />}
          </div>

          <label className="sr-only" htmlFor="archaeology-emergence">
            {t('archaeology.emergence.sliderLabel')}
          </label>
          <input
            id="archaeology-emergence"
            type="range"
            min={0}
            max={100}
            step={1}
            value={value}
            onChange={e => setValue(Number(e.target.value))}
            className="sr-only"
          />

          <div className="flex items-start justify-between gap-2 mt-2 font-mono text-[9px] text-bunker/70">
            <span>{t('archaeology.emergence.min')}</span>
            <span className="text-flare shrink-0">{t('archaeology.emergence.current', { percent: effective })}</span>
            <span className="text-right">{t('archaeology.emergence.max')}</span>
          </div>
          {clamped && <div className="mt-1 font-mono text-[9px] text-prismatic/80">{t('archaeology.emergence.clamped', { percent: maxValue })}</div>}
        </div>
      </div>
    </section>
  )
}

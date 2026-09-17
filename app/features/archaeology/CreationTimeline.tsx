'use client'

import { useCallback, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '@/app/lib/i18n/I18nProvider'
import { useLiturgy } from '@/app/lib/LiturgyContext'
import { RESOLVED_EVENTS, eventAt, formatStamp } from './timeline'

/**
 * TIMELINE — four days of creation, scrubbed by hand.
 *
 * Drag the playhead (pointer) or step with the arrow keys. Each dot is an
 * artefact that still ships in `public/eon/`; most timestamps are that file's
 * real modification time, the two reconstructed ones render with "≈".
 */

export function CreationTimeline() {
  const { t } = useI18n()
  const { reducedMotion } = useLiturgy()
  const [index, setIndex] = useState(5) // start on the moment the face appeared
  const trackRef = useRef<HTMLDivElement>(null)

  const active = RESOLVED_EVENTS[index]

  const setFromPointer = useCallback((clientX: number) => {
    const el = trackRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setIndex(eventAt(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))))
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    setFromPointer(e.clientX)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.buttons === 0) return
    setFromPointer(e.clientX)
  }

  const step = (delta: number) => setIndex(i => Math.max(0, Math.min(RESOLVED_EVENTS.length - 1, i + delta)))

  return (
    <section className="mb-6 sm:mb-8 p-4 border border-stratosphere/30 bg-stratosphere/5">
      <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-stratosphere mb-1">{t('archaeology.timeline.label')}</div>
      <p className="font-mono text-[11px] text-bone/75 leading-relaxed mb-4">{t('archaeology.timeline.intro')}</p>

      {/* scrubber */}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={t('archaeology.timeline.sliderLabel')}
        aria-valuemin={0}
        aria-valuemax={RESOLVED_EVENTS.length - 1}
        aria-valuenow={index}
        aria-valuetext={`${formatStamp(active.iso)} — ${t(`archaeology.timeline.events.${active.id}.title`)}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={e => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault()
            step(1)
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault()
            step(-1)
          } else if (e.key === 'Home') {
            e.preventDefault()
            setIndex(0)
          } else if (e.key === 'End') {
            e.preventDefault()
            setIndex(RESOLVED_EVENTS.length - 1)
          }
        }}
        className="relative h-12 cursor-ew-resize touch-none select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-stratosphere"
        style={{ touchAction: 'none' }}
      >
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-bunker/40" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-px bg-stratosphere" style={{ width: `${active.pos * 100}%` }} />
        {RESOLVED_EVENTS.map((e, i) => (
          <span
            key={e.id}
            aria-hidden
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full transition-colors ${
              i === index ? 'w-3 h-3 bg-flare' : i < index ? 'w-1.5 h-1.5 bg-stratosphere' : 'w-1.5 h-1.5 bg-bunker/50'
            }`}
            style={{ left: `${e.pos * 100}%` }}
          />
        ))}
        <span
          aria-hidden
          className="absolute top-0 bottom-0 w-px bg-flare/70"
          style={{ left: `${active.pos * 100}%` }}
        />
      </div>

      {/* stepper — a touch-sized alternative to dragging a 1.5 px dot */}
      <div className="flex items-center gap-2 mt-1">
        <button
          onClick={() => step(-1)}
          disabled={index === 0}
          aria-label={t('archaeology.timeline.prev')}
          className="w-9 h-9 flex items-center justify-center border border-bunker/40 text-bunker hover:text-bone hover:border-bone disabled:opacity-30 font-mono text-xs transition-colors"
        >
          ←
        </button>
        <button
          onClick={() => step(1)}
          disabled={index === RESOLVED_EVENTS.length - 1}
          aria-label={t('archaeology.timeline.next')}
          className="w-9 h-9 flex items-center justify-center border border-bunker/40 text-bunker hover:text-bone hover:border-bone disabled:opacity-30 font-mono text-xs transition-colors"
        >
          →
        </button>
        <span className="font-mono text-[9px] text-bunker/60 ml-auto">
          {t('archaeology.timeline.position', { n: index + 1, total: RESOLVED_EVENTS.length })}
        </span>
      </div>

      {/* active event card */}
      <motion.div
        key={active.id}
        initial={reducedMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 p-3 sm:p-4 border border-stratosphere/40 bg-void/70"
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-[11px] text-flare">
            {active.approx ? '≈ ' : ''}
            {formatStamp(active.iso)}
          </span>
          <span className="font-mono text-[9px] text-bunker/60">
            {active.approx ? t('archaeology.timeline.approx') : t('archaeology.timeline.exact')}
          </span>
        </div>
        <h4 className="font-display text-lg sm:text-xl text-bone mt-1 leading-tight">{t(`archaeology.timeline.events.${active.id}.title`)}</h4>
        <p className="font-mono text-xs text-bone/75 leading-relaxed mt-2">{t(`archaeology.timeline.events.${active.id}.text`)}</p>
        {active.file && (
          <div className="font-mono text-[10px] text-stratosphere/80 mt-3 truncate ltr" dir="ltr">
            → {active.file}
          </div>
        )}
      </motion.div>
    </section>
  )
}

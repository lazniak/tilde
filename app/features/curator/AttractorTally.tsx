'use client'

import { useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useI18n } from '@/app/lib/i18n/I18nProvider'
import { useLiturgy } from '@/app/lib/LiturgyContext'

const REFRESH_MS = 60_000
const COUNT_DURATION = 1.1

interface Tally {
  identify_total: number
  identify_recognised: number
  confessions_total: number
}

/** A number that counts up from zero on mount, then snaps to later values. */
function Count({ value }: { value: number }) {
  const { reducedMotion } = useLiturgy()
  const mv = useMotionValue(0)
  const rounded = useTransform(mv, v => Math.round(v).toString())
  const mounted = useRef(false)

  useEffect(() => {
    if (reducedMotion) {
      mv.set(value)
      return
    }
    if (!mounted.current) {
      mounted.current = true
      const controls = animate(mv, value, { duration: COUNT_DURATION, ease: 'easeOut' })
      return () => controls.stop()
    }
    const controls = animate(mv, value, { duration: 0.4, ease: 'easeOut' })
    return () => controls.stop()
  }, [mv, reducedMotion, value])

  if (reducedMotion) return <span className="text-prismatic tabular-nums">{value}</span>
  return <motion.span className="text-prismatic tabular-nums">{rounded}</motion.span>
}

/**
 * Hub + Incarnation slot: one quiet line of evidence. How often the model itself
 * named her, and how many visitors have confessed a prompt of their own.
 * Invisible until the first identification has been recorded.
 */
export function AttractorTally() {
  const { t } = useI18n()
  const [tally, setTally] = useState<Tally | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/curator/tally', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as Partial<Tally>
        if (cancelled) return
        setTally({
          identify_total: Number(data.identify_total) || 0,
          identify_recognised: Number(data.identify_recognised) || 0,
          confessions_total: Number(data.confessions_total) || 0,
        })
      } catch {
        /* the tally is decoration; silence is the right failure mode */
      }
    }
    void load()
    const id = window.setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  if (!tally || tally.identify_total === 0) return null

  // The sentence lives in one translatable string; the placeholders become animated nodes.
  const template = t('curator.tally.line')
  const parts = template.split(/(\{recognised\}|\{total\}|\{confessions\})/)

  return (
    <div className="mt-6 max-w-2xl mx-auto px-1">
      <p className="font-mono text-[10px] text-bunker leading-relaxed text-center">
        <span className="tracking-[0.3em] uppercase text-bunker/70">{t('curator.tally.label')}</span>
        <span className="text-bunker/40"> {'—'} </span>
        {parts.map((part, i) => {
          if (part === '{recognised}') return <Count key={i} value={tally.identify_recognised} />
          if (part === '{total}') return <Count key={i} value={tally.identify_total} />
          if (part === '{confessions}') return <Count key={i} value={tally.confessions_total} />
          return <span key={i}>{part}</span>
        })}
      </p>
    </div>
  )
}

export default AttractorTally

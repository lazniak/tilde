'use client'
/* eslint-disable @next/next/no-img-element */

// Embeddable widget. Designed for a 600×200 iframe, but fluid: it fills whatever box it gets.
// Security headers for /embed/* already allow framing (see next.config.js).

import { useEffect, useState } from 'react'
import { I18nProvider, useI18n } from '@/app/lib/i18n/I18nProvider'
import { AVATAR_IMAGE } from '@/app/lib/constants'

/** The project's own count: 68 clips were generated from the one prompt. */
const CLIP_COUNT = 68

/** The curator package owns /api/curator/tally; it may not exist yet (404 in dev). */
function pickNumber(data: unknown): number | null {
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>
  for (const key of ['total', 'count', 'votes', 'verdicts']) {
    if (typeof obj[key] === 'number') return obj[key] as number
  }
  const sum = Object.values(obj)
    .filter((v): v is number => typeof v === 'number')
    .reduce((a, b) => a + b, 0)
  return sum > 0 ? sum : null
}

function Card() {
  const { t } = useI18n()
  const [verdicts, setVerdicts] = useState<number | null>(null)
  const [testimonies, setTestimonies] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/api/curator/tally', { cache: 'no-store' })
        if (res.ok && alive) setVerdicts(pickNumber(await res.json()))
      } catch {
        /* the widget is happy without it */
      }
      try {
        const res = await fetch('/api/community/testimony', { cache: 'no-store' })
        if (res.ok && alive) {
          const data = (await res.json()) as { total?: number; testimonies?: unknown[] }
          setTestimonies(typeof data.total === 'number' ? data.total : (data.testimonies?.length ?? 0))
        }
      } catch {
        /* ditto */
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const numbers: { value: string; label: string }[] = [
    { value: String(CLIP_COUNT), label: t('community.embed.clips') },
    ...(testimonies !== null ? [{ value: String(testimonies), label: t('community.embed.testimonies') }] : []),
    ...(verdicts !== null ? [{ value: String(verdicts), label: t('community.embed.verdicts') }] : []),
  ]

  return (
    <a
      href="/"
      target="_top"
      className="group relative block w-full h-[100dvh] min-h-[160px] overflow-hidden bg-void text-bone border border-bunker/25"
    >
      <img
        src={AVATAR_IMAGE}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover object-top opacity-20 group-hover:opacity-30 transition-opacity"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-void via-void/85 to-void/40" />

      <div className="relative h-full flex flex-col justify-between p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="font-mono text-[8px] sm:text-[9px] tracking-[0.3em] uppercase text-stratosphere leading-tight">
            {t('community.embed.kicker')}
          </span>
          <span className="font-mono text-[8px] sm:text-[9px] tracking-[0.2em] uppercase text-bunker/60 shrink-0">
            eon.pablogfx.com
          </span>
        </div>

        <div className="min-w-0">
          <div className="font-display text-base sm:text-xl leading-none text-bone/90">
            {t('community.embed.title')}
          </div>
          <p className="font-mono text-[10px] sm:text-xs text-bone/80 leading-snug mt-1 line-clamp-2">
            {t('community.embed.question')}
          </p>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="flex gap-3 sm:gap-4">
            {numbers.map(n => (
              <div key={n.label} className="leading-none">
                <div className="font-display text-base sm:text-lg text-flare">{n.value}</div>
                <div className="font-mono text-[7px] sm:text-[8px] tracking-[0.2em] uppercase text-bunker/70 mt-0.5">
                  {n.label}
                </div>
              </div>
            ))}
          </div>
          <span className="font-mono text-[9px] sm:text-[10px] tracking-[0.25em] uppercase text-flare border border-flare/40 group-hover:bg-flare/10 px-2 py-2 min-h-[36px] flex items-center transition-colors shrink-0">
            {t('community.embed.enter')} →
          </span>
        </div>
      </div>
    </a>
  )
}

export default function EmbedPage() {
  return (
    <I18nProvider>
      <Card />
    </I18nProvider>
  )
}

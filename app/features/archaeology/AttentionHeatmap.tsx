'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '@/app/lib/i18n/I18nProvider'
import { useLiturgy } from '@/app/lib/LiturgyContext'
import { gatedFetch } from '@/app/lib/curatorClient'
import { PAUL_PROMPT } from '@/app/lib/constants'

/**
 * ATTENTION ARCHAEOLOGY — which words pulled the face?
 *
 * The model is asked to weight fragments of the original English prompt by how
 * hard each would drag a diffusion system toward that particular face. Weights
 * are keyed to the English text, so the heat is always painted on the original
 * even when the surrounding UI is translated.
 */

interface HeatPhrase {
  phrase: string
  weight: number
  reason: string
}

interface HeatmapResponse {
  phrases?: HeatPhrase[]
  summary?: string
  model?: string
  cached?: boolean
  error?: string
}

type Segment = { text: string; weight: number | null }

/** Paint each phrase's first non-overlapping occurrence, longest first. */
function buildSegments(text: string, phrases: HeatPhrase[]): Segment[] {
  const spans: { start: number; end: number; weight: number }[] = []
  const ordered = [...phrases].sort((a, b) => b.phrase.length - a.phrase.length)

  for (const p of ordered) {
    let from = 0
    for (;;) {
      const at = text.indexOf(p.phrase, from)
      if (at < 0) break
      const end = at + p.phrase.length
      if (!spans.some(s => at < s.end && end > s.start)) {
        spans.push({ start: at, end, weight: p.weight })
        break
      }
      from = at + 1
    }
  }

  spans.sort((a, b) => a.start - b.start)
  const out: Segment[] = []
  let cursor = 0
  for (const s of spans) {
    if (s.start > cursor) out.push({ text: text.slice(cursor, s.start), weight: null })
    out.push({ text: text.slice(s.start, s.end), weight: s.weight })
    cursor = s.end
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), weight: null })
  return out
}

function Dots() {
  return (
    <span className="inline-flex gap-1 align-middle" aria-hidden>
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 bg-flare"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </span>
  )
}

export function AttentionHeatmap() {
  const { t, tOptional, lang } = useI18n()
  const { reducedMotion } = useLiturgy()

  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<HeatmapResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const translated = tOptional('genesis.prompt')
  const showOriginalNote = !!translated && translated !== PAUL_PROMPT

  const phrases = data?.phrases ?? []
  const segments = useMemo(() => (phrases.length ? buildSegments(PAUL_PROMPT, phrases) : null), [phrases])
  const top = useMemo(() => [...phrases].sort((a, b) => b.weight - a.weight).slice(0, 6), [phrases])

  const excavate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await gatedFetch('/api/archaeology/heatmap', { method: 'POST', body: JSON.stringify({ lang }) })
      const body = (await res.json().catch(() => ({}))) as HeatmapResponse
      if (!res.ok || body.error || !body.phrases?.length) {
        setError(body.error || t('archaeology.heatmap.error'))
        setData(null)
      } else {
        setData(body)
      }
    } catch {
      setError(t('archaeology.heatmap.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mb-6 sm:mb-8 p-4 border border-flare/30 bg-flare/5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-flare">{t('archaeology.heatmap.label')}</div>
        {data?.model && <div className="font-mono text-[9px] text-bunker/60">{t('archaeology.heatmap.model', { model: data.model })}</div>}
      </div>
      <p className="font-mono text-[11px] sm:text-xs text-bone/75 leading-relaxed mb-3">{t('archaeology.heatmap.intro')}</p>

      {!segments && (
        <button
          onClick={excavate}
          disabled={loading}
          className="min-h-[44px] px-5 py-3 border border-flare text-flare hover:bg-flare/10 disabled:opacity-60 disabled:cursor-wait font-mono text-xs tracking-[0.2em] uppercase transition-all flex items-center gap-3"
        >
          {loading ? (
            <>
              <Dots /> {t('archaeology.heatmap.working')}
            </>
          ) : (
            <>⚡ {t('archaeology.heatmap.button')}</>
          )}
        </button>
      )}

      {error && (
        <div className="mt-3 p-3 border border-bunker/30 bg-void/60">
          <div className="font-mono text-[10px] text-bunker/60 mb-1">{t('archaeology.heatmap.errorLabel')}</div>
          <p className="font-mono text-xs text-bone/70">{error}</p>
          <button onClick={excavate} className="mt-3 min-h-[36px] px-3 py-2 border border-bunker/40 hover:border-flare hover:text-flare font-mono text-[10px] text-bunker transition-colors">
            {t('archaeology.heatmap.retry')}
          </button>
        </div>
      )}

      {segments && (
        <motion.div initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
          {showOriginalNote && <div className="font-mono text-[9px] text-bunker/70 mb-2">{t('archaeology.heatmap.originalNote')}</div>}

          <div className="p-3 sm:p-4 border border-bunker/20 bg-void/60 ltr" dir="ltr">
            <p className="font-display text-sm sm:text-base leading-relaxed text-bone whitespace-pre-line">
              {segments.map((s, i) =>
                s.weight === null ? (
                  <span key={i}>{s.text}</span>
                ) : (
                  <span
                    key={i}
                    title={`${Math.round(s.weight * 100)}%`}
                    style={{ backgroundColor: `rgba(217,108,44,${s.weight * 0.55})` }}
                    className="px-0.5"
                  >
                    {s.text}
                  </span>
                )
              )}
            </p>
          </div>

          {data?.summary && (
            <div className="mt-3 p-3 border-l-4 border-flare bg-flare/10">
              <div className="font-mono text-[10px] text-flare mb-1">{t('archaeology.heatmap.summaryLabel')}</div>
              <p className="font-mono text-xs text-bone/85 leading-relaxed">{data.summary}</p>
            </div>
          )}

          <div className="mt-4">
            <div className="font-mono text-[10px] text-stratosphere mb-2">{t('archaeology.heatmap.topLabel')}</div>
            <ol className="space-y-2">
              {top.map((p, i) => (
                <li key={`${p.phrase}-${i}`} className="p-2 border border-bunker/20 bg-void/40">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[10px] text-bunker/60 shrink-0">{(i + 1).toString().padStart(2, '0')}</span>
                    <span className="font-mono text-[11px] text-bone ltr" dir="ltr">
                      “{p.phrase}”
                    </span>
                    <span className="font-mono text-[10px] text-flare ml-auto shrink-0">{Math.round(p.weight * 100)}%</span>
                  </div>
                  <div className="mt-1 h-0.5 bg-bunker/20">
                    <div className="h-full bg-flare/70" style={{ width: `${Math.round(p.weight * 100)}%` }} />
                  </div>
                  {p.reason && <p className="mt-1.5 font-mono text-[10px] text-bunker/80 leading-relaxed">{p.reason}</p>}
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[9px] text-bunker/50">
              {data?.cached ? t('archaeology.heatmap.cached') : t('archaeology.heatmap.fresh')}
            </span>
            <span className="font-mono text-[9px] text-bunker/50">{t('archaeology.heatmap.count', { count: phrases.length })}</span>
          </div>
        </motion.div>
      )}
    </section>
  )
}

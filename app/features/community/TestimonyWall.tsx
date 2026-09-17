'use client'

// TESTIMONIES — WHOSE FACE IS IT?
// A slow vertical litany of approved sentences (credits-style CSS scroll, pausable),
// plus the form that adds one.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '@/app/lib/i18n/I18nProvider'
import { useLiturgy } from '@/app/lib/LiturgyContext'
import { gatedFetch } from '@/app/lib/curatorClient'
import { TESTIMONY_MAX, TESTIMONY_NAME_MAX, type PublicTestimony } from './lib/limits'

const KEYFRAMES = `
@keyframes liturgy-litany {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(0, -50%, 0); }
}
.liturgy-litany-track { animation: liturgy-litany linear infinite; will-change: transform; }
.liturgy-litany-viewport:hover .liturgy-litany-track { animation-play-state: paused; }
`

type Status = 'idle' | 'sending' | 'done' | 'queued'

function Line({ row, onShare, sharedId }: { row: PublicTestimony; onShare: (id: string) => void; sharedId: string | null }) {
  const { t } = useI18n()
  return (
    <div className="py-2.5 border-b border-bunker/10">
      <p className="font-mono text-[11px] sm:text-xs text-bone/85 leading-relaxed">{row.text}</p>
      <div className="mt-1 flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-bunker/70">
          {row.name || t('community.testimonies.anonymous')}
        </span>
        <span className="font-mono text-[9px] text-prismatic/50">{row.lang.toUpperCase()}</span>
        <button
          type="button"
          onClick={() => onShare(row.id)}
          className="ml-auto min-h-[36px] px-2 font-mono text-[9px] tracking-[0.2em] uppercase text-bunker/60 hover:text-prismatic transition-colors"
        >
          {sharedId === row.id ? t('community.testimonies.copied') : t('community.testimonies.share')}
        </button>
      </div>
    </div>
  )
}

export function TestimonyWall() {
  const { t, lang } = useI18n()
  const { reducedMotion } = useLiturgy()

  const [rows, setRows] = useState<PublicTestimony[]>([])
  const [loaded, setLoaded] = useState(false)
  const [paused, setPaused] = useState(false)
  const [sharedId, setSharedId] = useState<string | null>(null)

  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/community/testimony', { cache: 'no-store' })
      if (!res.ok) throw new Error('feed')
      const data = (await res.json()) as { testimonies?: PublicTestimony[] }
      if (!mounted.current) return
      setRows(Array.isArray(data.testimonies) ? data.testimonies : [])
    } catch {
      /* the wall simply stays empty — never crash the hub */
    } finally {
      if (mounted.current) setLoaded(true)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const sentence = text.trim()
      if (!sentence || status === 'sending') return
      setStatus('sending')
      setError(null)
      try {
        const res = await gatedFetch('/api/community/testimony', {
          method: 'POST',
          body: JSON.stringify({ text: sentence, name: name.trim(), lang }),
        })
        const data = (await res.json().catch(() => ({}))) as { code?: string; status?: string }
        if (!res.ok) {
          const key = data.code && ['rate', 'url', 'email', 'slur', 'duplicate', 'empty'].includes(data.code) ? data.code : 'generic'
          setError(t(`community.testimonies.errors.${key}`))
          setStatus('idle')
          return
        }
        setText('')
        setName('')
        setStatus(data.status === 'pending' ? 'queued' : 'done')
        await load()
      } catch {
        setError(t('community.testimonies.errors.network'))
        setStatus('idle')
      }
    },
    [lang, load, name, status, t, text]
  )

  const share = useCallback(
    async (id: string) => {
      const url = `${window.location.origin}/c/${id}`
      try {
        await navigator.clipboard.writeText(url)
        setSharedId(id)
        window.setTimeout(() => setSharedId(null), 2000)
      } catch {
        window.open(url, '_blank', 'noopener')
      }
    },
    []
  )

  // The track is rendered twice so the -50% loop is seamless.
  const scrollable = !reducedMotion && rows.length > 3
  const duration = useMemo(() => Math.max(40, rows.length * 7), [rows.length])
  const remaining = TESTIMONY_MAX - text.length

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      className="mt-10 sm:mt-12 max-w-3xl mx-auto p-4 sm:p-6 border border-prismatic/25 bg-void/60"
    >
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-prismatic">
        {t('community.testimonies.label')}
      </div>
      <h3 className="font-display text-2xl sm:text-3xl mt-2">{t('community.testimonies.title')}</h3>
      <p className="font-mono text-[11px] sm:text-xs text-bunker mt-2 leading-relaxed">
        {t('community.testimonies.intro')}
      </p>

      {/* The litany */}
      <div className="mt-5 border-t border-prismatic/15 pt-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-bunker/60">
            {t('community.testimonies.count', { n: rows.length })}
          </span>
          {scrollable && (
            <button
              type="button"
              onClick={() => setPaused(p => !p)}
              aria-pressed={paused}
              className="min-h-[36px] px-3 font-mono text-[9px] tracking-[0.25em] uppercase border border-bunker/30 text-bunker hover:border-prismatic hover:text-prismatic transition-colors"
            >
              {paused ? t('community.testimonies.resume') : t('community.testimonies.pause')}
            </button>
          )}
        </div>

        {!loaded && <p className="font-mono text-[11px] text-bunker/60 py-6 text-center">{t('community.testimonies.loading')}</p>}
        {loaded && rows.length === 0 && (
          <p className="font-mono text-[11px] text-bunker/60 py-6 text-center">{t('community.testimonies.empty')}</p>
        )}

        {loaded && rows.length > 0 && (
          <div
            className={`liturgy-litany-viewport relative overflow-hidden ${scrollable ? 'h-[17rem] sm:h-[21rem]' : 'max-h-[21rem] overflow-y-auto'}`}
            style={
              scrollable
                ? {
                    maskImage: 'linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)',
                  }
                : undefined
            }
            onPointerDown={e => {
              if (!scrollable) return
              if ((e.target as HTMLElement).closest('button')) return
              setPaused(p => !p)
            }}
          >
            <div
              className={scrollable ? 'liturgy-litany-track' : ''}
              style={
                scrollable
                  ? { animationDuration: `${duration}s`, animationPlayState: paused ? 'paused' : 'running' }
                  : undefined
              }
            >
              {(scrollable ? [0, 1] : [0]).map(copy => (
                <div key={copy} aria-hidden={copy === 1}>
                  {rows.map(row => (
                    <Line key={`${copy}-${row.id}`} row={row} onShare={share} sharedId={sharedId} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
        {scrollable && (
          <p className="font-mono text-[9px] text-bunker/40 mt-2 text-center">{t('community.testimonies.pauseHint')}</p>
        )}
      </div>

      {/* The offering of a sentence */}
      <form onSubmit={submit} className="mt-6 border-t border-prismatic/15 pt-4 space-y-3">
        <label className="block">
          <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-bunker/70">
            {t('community.testimonies.form.sentenceLabel')}
          </span>
          <textarea
            value={text}
            onChange={e => setText(e.target.value.slice(0, TESTIMONY_MAX))}
            maxLength={TESTIMONY_MAX}
            rows={2}
            placeholder={t('community.testimonies.form.sentencePlaceholder')}
            className="mt-1 w-full bg-void border border-bunker/30 focus:border-prismatic/70 outline-none p-3 font-mono text-[12px] text-bone placeholder:text-bunker/40 resize-none"
          />
        </label>
        <div className="flex items-center justify-between gap-3">
          <span className={`font-mono text-[9px] ${remaining < 15 ? 'text-flare' : 'text-bunker/60'}`}>
            {t('community.testimonies.form.counter', { n: text.length, max: TESTIMONY_MAX })}
          </span>
        </div>
        <label className="block">
          <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-bunker/70">
            {t('community.testimonies.form.nameLabel')}
          </span>
          <input
            value={name}
            onChange={e => setName(e.target.value.slice(0, TESTIMONY_NAME_MAX))}
            maxLength={TESTIMONY_NAME_MAX}
            placeholder={t('community.testimonies.form.namePlaceholder')}
            className="mt-1 w-full bg-void border border-bunker/30 focus:border-prismatic/70 outline-none p-3 font-mono text-[12px] text-bone placeholder:text-bunker/40"
          />
        </label>

        {error && <p className="font-mono text-[10px] text-flare">{error}</p>}
        {status === 'done' && <p className="font-mono text-[10px] text-prismatic">{t('community.testimonies.form.thanks')}</p>}
        {status === 'queued' && <p className="font-mono text-[10px] text-prismatic">{t('community.testimonies.form.queued')}</p>}

        <button
          type="submit"
          disabled={!text.trim() || status === 'sending'}
          className="w-full sm:w-auto min-h-[40px] px-5 font-mono text-[10px] tracking-[0.3em] uppercase border border-prismatic/40 text-prismatic hover:bg-prismatic/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          {status === 'sending' ? t('community.testimonies.form.sending') : t('community.testimonies.form.submit')}
        </button>
      </form>
    </motion.section>
  )
}

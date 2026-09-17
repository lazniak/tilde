'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SITE_URL } from '@/app/lib/constants'
import { gatedFetch } from '@/app/lib/curatorClient'
import { useI18n } from '@/app/lib/i18n/I18nProvider'
import { useLiturgy } from '@/app/lib/LiturgyContext'

const MAX_CHARS = 600
const BAR_SEGMENTS = 5

interface Result {
  archetype: string
  face: string
  why: string
  attractor_strength: number
  verdict: string
}

interface Rejection {
  rejected: true
  reason: string
}

type Outcome = Result | Rejection

function isRejection(o: Outcome): o is Rejection {
  return (o as Rejection).rejected === true
}

/** Five blocks in house style: filled / empty. */
function attractorBar(strength: number): string {
  const filled = Math.max(0, Math.min(BAR_SEGMENTS, Math.round((strength / 100) * BAR_SEGMENTS)))
  return '▓'.repeat(filled) + '░'.repeat(BAR_SEGMENTS - filled)
}

function LabelRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-2 border-t border-bunker/20 first:border-t-0 first:pt-0">
      <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-prismatic/70 mb-1">{label}</div>
      <div className="font-mono text-[12px] sm:text-sm text-bone/85 leading-relaxed" dir="auto">
        {children}
      </div>
    </div>
  )
}

/** Exegesis slot: the visitor writes their own abstract prompt and is told which face it attracts. */
export function ConfessPrompt() {
  const { t, lang } = useI18n()
  const { reducedMotion } = useLiturgy()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
    },
    []
  )

  const submit = useCallback(async () => {
    const prompt = value.trim()
    if (!prompt) {
      setError(t('curator.confess.error.empty'))
      return
    }
    if (loading) return
    setLoading(true)
    setError(null)
    setOutcome(null)
    try {
      const res = await gatedFetch('/api/curator/confess', {
        method: 'POST',
        body: JSON.stringify({ prompt, lang }),
      })
      const data = (await res.json().catch(() => ({}))) as Partial<Result & Rejection> & {
        error?: string
        retryAfter?: number
      }
      if (!res.ok) {
        if (res.status === 429) {
          setError(
            data.retryAfter
              ? t('curator.confess.error.rate', { seconds: data.retryAfter })
              : t('curator.confess.error.daily')
          )
        } else {
          setError(t('curator.confess.error.generic'))
        }
        return
      }
      if (data.rejected) {
        setOutcome({ rejected: true, reason: data.reason || t('curator.confess.rejected.fallback') })
      } else {
        setOutcome({
          archetype: data.archetype || '',
          face: data.face || '',
          why: data.why || '',
          attractor_strength: typeof data.attractor_strength === 'number' ? data.attractor_strength : 0,
          verdict: data.verdict || '',
        })
      }
    } catch {
      setError(t('curator.confess.error.generic'))
    } finally {
      setLoading(false)
    }
  }, [lang, loading, t, value])

  const share = useCallback(async () => {
    if (!outcome || isRejection(outcome)) return
    const title = t('curator.confess.shareTitle')
    const text = t('curator.confess.shareText', {
      archetype: outcome.archetype,
      verdict: outcome.verdict,
      strength: outcome.attractor_strength,
    })
    const nav = typeof navigator !== 'undefined' ? navigator : undefined
    try {
      if (nav && typeof nav.share === 'function') {
        await nav.share({ title, text, url: SITE_URL })
        return
      }
      await nav?.clipboard?.writeText(text + '\n' + SITE_URL)
      setCopied(true)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 2400)
    } catch {
      /* the visitor cancelled the share sheet, or the clipboard is unavailable */
    }
  }, [outcome, t])

  return (
    <div className="mb-4 border border-prismatic/25 bg-void/60">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full min-h-[44px] px-3 sm:px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors"
      >
        <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-prismatic">
          {t('curator.confess.label')}
        </span>
        <span className="font-mono text-[10px] text-bunker shrink-0">
          {open ? t('curator.confess.close') : t('curator.confess.open')}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={reducedMotion ? false : { height: 0, opacity: 0 }}
            animate={reducedMotion ? {} : { height: 'auto', opacity: 1 }}
            exit={reducedMotion ? {} : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-3 sm:px-4 pb-4 pt-1 border-t border-prismatic/15">
              <p className="font-mono text-[11px] text-bunker leading-relaxed mb-3">{t('curator.confess.intro')}</p>

              <label className="block">
                <span className="sr-only">{t('curator.confess.label')}</span>
                <textarea
                  value={value}
                  onChange={e => setValue(e.target.value.slice(0, MAX_CHARS))}
                  maxLength={MAX_CHARS}
                  rows={4}
                  dir="auto"
                  placeholder={t('curator.confess.placeholder')}
                  className="w-full bg-void border border-bunker/50 px-3 py-3 font-mono text-[16px] sm:text-sm text-bone placeholder-bunker/50 focus:border-prismatic focus:outline-none transition-colors resize-y"
                />
              </label>

              <div className="flex items-center justify-between gap-3 mt-2">
                <span className="font-mono text-[10px] text-bunker/60 tabular-nums">
                  {t('curator.confess.counter', { count: value.length, max: MAX_CHARS })}
                </span>
                <motion.button
                  type="button"
                  onClick={() => void submit()}
                  disabled={loading || !value.trim()}
                  whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                  className="min-h-[38px] px-4 py-2 bg-prismatic hover:bg-prismatic/80 disabled:bg-bunker/30 disabled:text-bunker text-void font-mono text-[11px] tracking-[0.15em] uppercase transition-all"
                >
                  {t('curator.confess.submit')}
                </motion.button>
              </div>

              {loading && (
                <div className="flex items-center gap-2 mt-4 p-3 border border-prismatic/20 bg-void/60">
                  {[0, 0.2, 0.4].map(d => (
                    <motion.div
                      key={d}
                      className="w-2 h-2 bg-prismatic"
                      animate={reducedMotion ? { opacity: 0.6 } : { opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: d }}
                    />
                  ))}
                  <span className="font-mono text-[10px] text-bunker/60 ml-2">{t('curator.confess.working')}</span>
                </div>
              )}

              {error && (
                <div
                  className="mt-4 p-3 border border-flare/30 bg-flare/5 font-mono text-[11px] text-flare/90"
                  role="status"
                >
                  {error}
                </div>
              )}

              {outcome && isRejection(outcome) && (
                <div className="mt-4 p-3 sm:p-4 border border-flare/30 bg-flare/5">
                  <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-flare mb-2">
                    {t('curator.confess.rejected.label')}
                  </div>
                  <p className="font-mono text-[12px] text-bone/85 leading-relaxed" dir="auto">
                    {outcome.reason}
                  </p>
                  <p className="font-mono text-[10px] text-bunker mt-2">{t('curator.confess.rejected.hint')}</p>
                </div>
              )}

              {outcome && !isRejection(outcome) && (
                <motion.div
                  initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 sm:p-4 border border-prismatic/30 bg-void/80"
                >
                  <LabelRow label={t('curator.confess.card.archetype')}>{outcome.archetype}</LabelRow>
                  <LabelRow label={t('curator.confess.card.topology')}>{outcome.face}</LabelRow>
                  <LabelRow label={t('curator.confess.card.why')}>{outcome.why}</LabelRow>
                  <LabelRow label={t('curator.confess.card.attractor')}>
                    <span className="text-prismatic tracking-[0.2em]" aria-hidden>
                      {attractorBar(outcome.attractor_strength)}
                    </span>{' '}
                    <span className="tabular-nums">{outcome.attractor_strength}%</span>
                  </LabelRow>
                  <LabelRow label={t('curator.confess.card.verdict')}>
                    <span className="font-display text-base sm:text-lg text-bone/90">{outcome.verdict}</span>
                  </LabelRow>

                  <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-bunker/20">
                    <button
                      type="button"
                      onClick={() => {
                        setOutcome(null)
                        setValue('')
                      }}
                      className="min-h-[36px] font-mono text-[10px] tracking-[0.2em] uppercase text-bunker hover:text-bone transition-colors"
                    >
                      {t('curator.confess.again')}
                    </button>
                    <button
                      type="button"
                      onClick={() => void share()}
                      className="min-h-[36px] px-3 border border-prismatic/40 hover:border-prismatic font-mono text-[10px] tracking-[0.2em] uppercase text-prismatic transition-colors"
                    >
                      {copied ? t('curator.confess.copied') : t('curator.confess.share')}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ConfessPrompt

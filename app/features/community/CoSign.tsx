'use client'

// CO-SIGN THE LETTER TO TILDA SWINTON
// Four lines of the letter, a running count, the last twelve signatures
// ("First L. · City"), the signing form and the full letter on demand.

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useI18n } from '@/app/lib/i18n/I18nProvider'
import { gatedFetch } from '@/app/lib/curatorClient'
import { Markdown } from './Markdown'
import { LETTER_EXCERPT, LETTER_MARKDOWN } from './lib/letter'
import { COSIGN_CITY_MAX, COSIGN_NAME_MAX } from './lib/limits'

interface Signature {
  display: string
  city: string
}

type Status = 'idle' | 'sending' | 'done'

export function CoSign() {
  const { t } = useI18n()

  const [count, setCount] = useState<number | null>(null)
  const [recent, setRecent] = useState<Signature[]>([])
  const [open, setOpen] = useState(false)

  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [consent, setConsent] = useState(false)
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
      const res = await fetch('/api/community/cosign', { cache: 'no-store' })
      if (!res.ok) throw new Error('register')
      const data = (await res.json()) as { count?: number; recent?: Signature[] }
      if (!mounted.current) return
      setCount(typeof data.count === 'number' ? data.count : 0)
      setRecent(Array.isArray(data.recent) ? data.recent : [])
    } catch {
      if (mounted.current) setCount(prev => prev ?? 0)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (status === 'sending') return
      if (!name.trim()) {
        setError(t('community.cosign.errors.name'))
        return
      }
      if (!consent) {
        setError(t('community.cosign.errors.consent'))
        return
      }
      setStatus('sending')
      setError(null)
      try {
        const res = await gatedFetch('/api/community/cosign', {
          method: 'POST',
          body: JSON.stringify({ name: name.trim(), city: city.trim(), consent: true }),
        })
        const data = (await res.json().catch(() => ({}))) as { code?: string; count?: number; recent?: Signature[] }
        if (!res.ok) {
          const key =
            data.code && ['rate', 'duplicate', 'consent', 'name', 'rejected'].includes(data.code) ? data.code : 'generic'
          setError(t(`community.cosign.errors.${key}`))
          setStatus('idle')
          return
        }
        setName('')
        setCity('')
        setConsent(false)
        setStatus('done')
        if (typeof data.count === 'number') setCount(data.count)
        if (Array.isArray(data.recent)) setRecent(data.recent)
      } catch {
        setError(t('community.cosign.errors.network'))
        setStatus('idle')
      }
    },
    [city, consent, name, status, t]
  )

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      className="mt-6 sm:mt-8 max-w-3xl mx-auto p-4 sm:p-6 border border-stratosphere/30 bg-stratosphere/5"
    >
      <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-stratosphere">
        {t('community.cosign.label')}
      </div>
      <h3 className="font-display text-2xl sm:text-3xl mt-2">{t('community.cosign.title')}</h3>

      {/* Excerpt */}
      <div className="mt-4 border-l border-stratosphere/40 pl-3 space-y-2">
        {LETTER_EXCERPT.map((line, i) => (
          <p key={i} className="font-mono text-[11px] sm:text-xs text-bone/75 italic leading-relaxed">
            {line}
          </p>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="mt-3 min-h-[36px] px-3 font-mono text-[10px] tracking-[0.25em] uppercase border border-stratosphere/40 text-stratosphere hover:bg-stratosphere/10 transition-colors"
      >
        {open ? t('community.cosign.hideLetter') : t('community.cosign.readLetter')} {open ? '↑' : '↓'}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-3 sm:p-4 border border-bunker/20 bg-void/60 max-h-[26rem] overflow-y-auto">
              <Markdown source={LETTER_MARKDOWN} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Count + signatures */}
      <div className="mt-6 border-t border-stratosphere/20 pt-4">
        <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-bunker/70">
          {count === null
            ? t('community.cosign.counting')
            : t('community.cosign.count', { n: count })}
        </div>
        {recent.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
            {recent.map((s, i) => (
              <li key={i} className="font-mono text-[11px] text-bone/70">
                {s.display}
                {s.city ? <span className="text-bunker/60"> · {s.city}</span> : null}
              </li>
            ))}
          </ul>
        )}
        <p className="font-mono text-[9px] text-bunker/50 mt-3 leading-relaxed">{t('community.cosign.privacy')}</p>
      </div>

      {/* Form */}
      <form onSubmit={submit} className="mt-5 border-t border-stratosphere/20 pt-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-bunker/70">
              {t('community.cosign.form.nameLabel')}
            </span>
            <input
              value={name}
              onChange={e => setName(e.target.value.slice(0, COSIGN_NAME_MAX))}
              maxLength={COSIGN_NAME_MAX}
              required
              placeholder={t('community.cosign.form.namePlaceholder')}
              className="mt-1 w-full bg-void border border-bunker/30 focus:border-stratosphere outline-none p-3 font-mono text-[12px] text-bone placeholder:text-bunker/40"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-bunker/70">
              {t('community.cosign.form.cityLabel')}
            </span>
            <input
              value={city}
              onChange={e => setCity(e.target.value.slice(0, COSIGN_CITY_MAX))}
              maxLength={COSIGN_CITY_MAX}
              placeholder={t('community.cosign.form.cityPlaceholder')}
              className="mt-1 w-full bg-void border border-bunker/30 focus:border-stratosphere outline-none p-3 font-mono text-[12px] text-bone placeholder:text-bunker/40"
            />
          </label>
        </div>

        <label className="flex items-start gap-3 min-h-[36px] cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={e => setConsent(e.target.checked)}
            required
            className="mt-0.5 w-4 h-4 shrink-0 accent-stratosphere bg-void border border-bunker/40"
          />
          <span className="font-mono text-[10px] text-bone/75 leading-relaxed">{t('community.cosign.form.consent')}</span>
        </label>

        {error && <p className="font-mono text-[10px] text-flare">{error}</p>}
        {status === 'done' && <p className="font-mono text-[10px] text-stratosphere">{t('community.cosign.form.thanks')}</p>}

        <button
          type="submit"
          disabled={status === 'sending'}
          className="w-full sm:w-auto min-h-[40px] px-5 font-mono text-[10px] tracking-[0.3em] uppercase border border-stratosphere text-stratosphere hover:bg-stratosphere/10 disabled:opacity-30 transition-colors"
        >
          {status === 'sending' ? t('community.cosign.form.sending') : t('community.cosign.form.submit')}
        </button>
      </form>
    </motion.section>
  )
}

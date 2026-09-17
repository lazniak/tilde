'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_LOCALE, FEATURE_NAMESPACES, LOCALE_CODES, getLocale, matchLocale } from './config'

type Dict = Record<string, unknown>

interface I18nValue {
  lang: string
  setLang: (code: string) => void
  /** Translate a dotted key. Missing keys fall back to English, then to the key itself. */
  t: (key: string, vars?: Record<string, string | number>) => string
  /** Same as t but returns undefined for a missing key (no fallback to key). */
  tOptional: (key: string, vars?: Record<string, string | number>) => string | undefined
  /** Translate a key that holds an array of strings. */
  tList: (key: string) => string[]
  rtl: boolean
  ready: boolean
}

const I18nContext = createContext<I18nValue | null>(null)

const STORAGE_KEY = 'liturgy.lang'

function lookup(dict: Dict | null, key: string): unknown {
  if (!dict) return undefined
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Dict)) return (acc as Dict)[part]
    return undefined
  }, dict)
}

function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? String(vars[name]) : `{${name}}`))
}

async function loadDict(lang: string): Promise<Dict> {
  const parts = await Promise.all([
    import(`@/app/locales/${lang}.json`).then(m => m.default as Dict).catch(() => ({} as Dict)),
    ...FEATURE_NAMESPACES.map(ns =>
      import(`@/app/features/${ns}/i18n/${lang}.json`)
        .then(m => ({ [ns]: m.default as Dict }))
        .catch(() => ({} as Dict))
    ),
  ])
  return Object.assign({}, ...parts)
}

function readInitialLang(): string {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  try {
    const fromQuery = new URLSearchParams(window.location.search).get('lang')
    if (fromQuery && LOCALE_CODES.includes(fromQuery)) return fromQuery
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored && LOCALE_CODES.includes(stored)) return stored
  } catch {
    /* storage may be unavailable */
  }
  return matchLocale(navigator.languages ?? [navigator.language])
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<string>(DEFAULT_LOCALE)
  const [dict, setDict] = useState<Dict | null>(null)
  const [fallback, setFallback] = useState<Dict | null>(null)
  const [ready, setReady] = useState(false)

  // Resolve initial language on the client only (avoids hydration mismatch).
  useEffect(() => {
    setLangState(readInitialLang())
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [main, en] = await Promise.all([
        loadDict(lang),
        fallback ? Promise.resolve(fallback) : loadDict(DEFAULT_LOCALE),
      ])
      if (cancelled) return
      setFallback(en)
      setDict(main)
      setReady(true)
      const def = getLocale(lang)
      document.documentElement.lang = def.code
      document.documentElement.dir = def.rtl ? 'rtl' : 'ltr'
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  const setLang = useCallback((code: string) => {
    if (!LOCALE_CODES.includes(code)) return
    setLangState(code)
    try {
      window.localStorage.setItem(STORAGE_KEY, code)
      const url = new URL(window.location.href)
      url.searchParams.set('lang', code)
      window.history.replaceState(null, '', url.toString())
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo<I18nValue>(() => {
    const tOptional = (key: string, vars?: Record<string, string | number>) => {
      const v = lookup(dict, key) ?? lookup(fallback, key)
      return typeof v === 'string' ? interpolate(v, vars) : undefined
    }
    return {
      lang,
      setLang,
      ready,
      rtl: !!getLocale(lang).rtl,
      tOptional,
      t: (key, vars) => tOptional(key, vars) ?? key,
      tList: key => {
        const v = lookup(dict, key) ?? lookup(fallback, key)
        return Array.isArray(v) ? (v as string[]) : []
      },
    }
  }, [dict, fallback, lang, ready, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}

/** Convenience hook: `const t = useT()` */
export function useT() {
  return useI18n().t
}

/**
 * Inline rich text. Strings may contain light-weight tags that map to the palette:
 *  <p>…</p> prismatic, <f>…</f> flare, <s>…</s> stratosphere, <b>…</b> bold, <m>…</m> muted (bunker), <br/> line break.
 */
export function RichText({ k, vars, className }: { k: string; vars?: Record<string, string | number>; className?: string }) {
  const { t } = useI18n()
  return <span className={className}>{renderRich(t(k, vars))}</span>
}

const TAG_CLASS: Record<string, string> = {
  p: 'text-prismatic',
  f: 'text-flare',
  s: 'text-stratosphere',
  b: 'font-bold text-bone',
  m: 'text-bunker',
  i: 'italic',
}

export function renderRich(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const re = /<(p|f|s|b|m|i)>([\s\S]*?)<\/\1>|<br\s*\/?>/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[0].startsWith('<br')) {
      out.push(<br key={`br${i++}`} />)
    } else {
      out.push(
        <span key={`t${i++}`} className={TAG_CLASS[m[1]]}>
          {renderRich(m[2])}
        </span>
      )
    }
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

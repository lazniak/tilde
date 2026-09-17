'use client'

import { LOCALES } from '@/app/lib/i18n/config'
import { useI18n } from '@/app/lib/i18n/I18nProvider'

/** Native <select> — the only dropdown that behaves on every phone. Styled to the palette. */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { lang, setLang, t } = useI18n()
  return (
    <label className={`inline-flex items-center gap-2 font-mono text-[10px] text-bunker ${className}`}>
      <span className="sr-only">{t('common.language')}</span>
      <span aria-hidden className="text-stratosphere">
        ◍
      </span>
      <select
        value={lang}
        onChange={e => setLang(e.target.value)}
        className="bg-void border border-bunker/40 text-bone/80 px-2 py-1.5 font-mono text-[10px] tracking-wider focus:border-stratosphere focus:outline-none appearance-none cursor-pointer max-w-[9rem]"
        aria-label={t('common.language')}
      >
        {LOCALES.map(l => (
          <option key={l.code} value={l.code}>
            {l.name}
          </option>
        ))}
      </select>
    </label>
  )
}

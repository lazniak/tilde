'use client'

import { motion } from 'framer-motion'
import { SUPPORT_URL } from '@/app/lib/constants'
import { useI18n } from '@/app/lib/i18n/I18nProvider'

/** A votive candle. Same border-and-monospace language as the rest of the triptych. */
function Candle() {
  return (
    <span className="relative inline-block w-3 h-6 align-middle" aria-hidden>
      <motion.span
        className="absolute left-1/2 -translate-x-1/2 -top-2 w-1.5 h-3 rounded-full bg-flare"
        style={{ boxShadow: '0 0 12px 4px rgba(217,108,44,0.45)' }}
        animate={{ scaleY: [1, 1.25, 0.9, 1.1, 1], opacity: [0.9, 1, 0.8, 1, 0.9], x: ['-50%', '-45%', '-55%', '-50%'] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span className="absolute bottom-0 left-0 right-0 h-4 bg-bone/80" />
    </span>
  )
}

/** Hub block: an offering plate, not a donate widget. */
export function OfferingBlock() {
  const { t } = useI18n()
  return (
    <motion.a
      href={SUPPORT_URL}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.7 }}
      className="group block mt-10 max-w-md mx-auto p-4 border border-flare/25 hover:border-flare/60 bg-void/60 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Candle />
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10px] text-flare tracking-[0.3em]">{t('offering.title')}</div>
          <p className="font-mono text-[11px] text-bunker leading-relaxed mt-1">{t('offering.text')}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="font-mono text-[9px] text-bunker/60">{t('offering.sub')}</span>
        <span className="font-mono text-[10px] text-flare group-hover:tracking-[0.25em] tracking-[0.15em] transition-all">
          {t('offering.button')} →
        </span>
      </div>
    </motion.a>
  )
}

/** Tiny nav-bar variant: a single candle glyph. */
export function OfferingLink() {
  const { t } = useI18n()
  return (
    <a
      href={SUPPORT_URL}
      target="_blank"
      rel="noopener noreferrer"
      title={t('common.offeringHint')}
      aria-label={t('common.offering')}
      className="w-9 h-9 flex items-center justify-center border border-bunker/30 hover:border-flare text-bunker hover:text-flare transition-colors"
    >
      <Candle />
    </a>
  )
}

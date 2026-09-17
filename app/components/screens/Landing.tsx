'use client'

import { motion } from 'framer-motion'
import { useLiturgy } from '@/app/lib/LiturgyContext'
import { RichText, useI18n } from '@/app/lib/i18n/I18nProvider'
import { AVATAR_IMAGE } from '@/app/lib/constants'
import { LanguageSwitcher } from '../LanguageSwitcher'
import { unlockNarrator } from '../Narrator'
import { Slot } from '../Slot'

export function Landing() {
  const { enter, loadingProgress, isAudioReady, entered } = useLiturgy()
  const { t } = useI18n()
  const loading = loadingProgress > 0 && !entered

  const onEnter = () => {
    unlockNarrator() // must happen synchronously inside the tap
    void enter()
  }

  return (
    <motion.div
      key="landing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-10 sm:p-8 relative"
    >
      {/* Avatar background - the face that emerged */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <motion.div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${AVATAR_IMAGE})`, backgroundPosition: 'center 20%' }}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.08, scale: 1 }}
          transition={{ duration: 3, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-void/70 via-void/50 to-void/90" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 20%, rgba(10,10,12,0.8) 100%)' }} />
      </div>

      {/* Language, top right */}
      <div className="absolute top-3 right-3 sm:top-5 sm:right-5 z-20">
        <LanguageSwitcher />
      </div>

      {/* Subtle particles */}
      <div className="absolute inset-0 overflow-hidden z-10 pointer-events-none" aria-hidden>
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-0.5 h-0.5 bg-flare/30"
            style={{ left: `${20 + ((i * 37) % 60)}%`, top: `${20 + ((i * 53) % 60)}%` }}
            animate={{ opacity: [0.1, 0.4, 0.1] }}
            transition={{ duration: 4 + (i % 3), repeat: Infinity, delay: (i % 4) * 0.5 }}
          />
        ))}
      </div>

      {/* Title */}
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-center mb-6 relative z-10 w-full max-w-2xl">
        <motion.div className="font-mono text-[10px] sm:text-xs text-bunker tracking-[0.35em] sm:tracking-[0.5em] mb-3 sm:mb-4" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity }}>
          {t('landing.kicker')}
        </motion.div>
        <h1 className="font-display text-4xl sm:text-5xl md:text-7xl text-bone mb-5 sm:mb-6 leading-tight">{t('landing.title')}</h1>

        {/* THE THREE PROTAGONISTS */}
        <div className="mx-auto mb-6">
          <motion.div className="border border-prismatic/50 bg-void/70 p-4 sm:p-5 mb-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <div className="text-prismatic text-3xl sm:text-4xl mb-1 sm:mb-2 text-center">∞</div>
            <div className="font-mono text-[10px] sm:text-xs text-prismatic tracking-wider mb-1 sm:mb-2 text-center">{t('landing.muse.label')}</div>
            <div className="font-display text-xl sm:text-2xl text-bone mb-2 sm:mb-3 text-center">{t('landing.muse.name')}</div>
            <p className="font-mono text-[11px] sm:text-xs text-bone/80 leading-relaxed text-center">
              <RichText k="landing.muse.text" />
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <motion.div className="border border-flare/30 bg-void/70 p-3 sm:p-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
              <div className="text-flare text-lg sm:text-xl mb-1 text-center">II</div>
              <div className="font-mono text-[9px] sm:text-[10px] text-flare tracking-wider mb-1 text-center">{t('landing.corp.label')}</div>
              <div className="font-display text-base text-bone mb-1 text-center">{t('landing.corp.name')}</div>
              <p className="font-mono text-[9px] text-bone/60 leading-relaxed text-center">
                <RichText k="landing.corp.text" />
              </p>
            </motion.div>
            <motion.div className="border border-stratosphere/30 bg-void/70 p-3 sm:p-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
              <div className="text-stratosphere text-lg sm:text-xl mb-1 text-center">III</div>
              <div className="font-mono text-[9px] sm:text-[10px] text-stratosphere tracking-wider mb-1 text-center">{t('landing.artist.label')}</div>
              <div className="font-display text-base text-bone mb-1 text-center">{t('landing.artist.name')}</div>
              <p className="font-mono text-[9px] text-bone/60 leading-relaxed text-center">
                <RichText k="landing.artist.text" />
              </p>
            </motion.div>
          </div>
        </div>

        <motion.div className="max-w-lg mx-auto text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
          <p className="font-mono text-[11px] text-bone/70 leading-relaxed">
            <RichText k="landing.essence" />
          </p>
        </motion.div>
      </motion.div>

      {/* ENTER Button — one tap: loads the stems and starts the liturgy */}
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.3 }} className="mt-2 relative z-10 flex flex-col items-center gap-3">
        <motion.button
          onClick={onEnter}
          disabled={loading}
          className="group relative px-14 sm:px-20 py-5 sm:py-6 bg-flare hover:bg-flare/85 disabled:bg-flare/70 transition-all min-w-[16rem]"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {loading && !isAudioReady ? (
            <div className="flex items-center gap-4 justify-center">
              <div className="w-32 h-1 bg-void/30">
                <motion.div className="h-full bg-void" animate={{ width: `${loadingProgress}%` }} />
              </div>
              <span className="font-mono text-sm text-void">{loadingProgress}%</span>
            </div>
          ) : (
            <span className="font-mono text-lg sm:text-xl tracking-[0.3em] text-void font-bold">{t('common.enter')}</span>
          )}
          <motion.div className="absolute inset-0 border-2 border-flare pointer-events-none" animate={{ scale: [1, 1.05, 1], opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }} />
        </motion.button>
        <div className="font-mono text-[9px] text-bunker/70 text-center">{loading ? t('landing.loading') : t('landing.audioNote')}</div>
      </motion.div>

      <div className="relative z-10 w-full max-w-2xl">
        <Slot name="landingExtras" />
      </div>
    </motion.div>
  )
}

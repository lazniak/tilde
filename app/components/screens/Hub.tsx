'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useLiturgy } from '@/app/lib/LiturgyContext'
import { RichText, useI18n } from '@/app/lib/i18n/I18nProvider'
import { STEMS } from '@/app/lib/constants'
import { ASSEMBLAGE_STAGES } from '@/app/lib/constants'
import { AmbientBackground } from '../AmbientBackground'
import { StemMixer } from '../StemMixer'
import { OfferingBlock } from '../Offering'
import { LanguageSwitcher } from '../LanguageSwitcher'
import { Slot } from '../Slot'
import { narrator } from '../Narrator'

const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`

export function Hub() {
  const { goToSection, currentStage, currentTime, isPlaying, toggleAudio, showMixer, setShowMixer } = useLiturgy()
  const { t, lang } = useI18n()
  const activeLayers = [...ASSEMBLAGE_STAGES[currentStage].layers] as number[]

  const cards = [
    { id: 'genesis' as const, glyph: '◇', color: 'stratosphere', hover: 'hover:border-stratosphere hover:bg-stratosphere/5', text: 'text-stratosphere', delay: 0.2 },
    { id: 'incarnation' as const, glyph: '◈', color: 'flare', hover: 'hover:border-flare hover:bg-flare/5', text: 'text-flare', delay: 0.3 },
    { id: 'exegesis' as const, glyph: '◆', color: 'prismatic', hover: 'hover:border-prismatic hover:bg-prismatic/5', text: 'text-prismatic', delay: 0.4 },
  ]

  return (
    <motion.div key="explore" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-[100dvh] px-3 py-4 sm:p-8 pb-[calc(var(--nav-h)+2rem)] relative">
      <AmbientBackground screenKey="explore" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between gap-2 mb-6 sm:mb-8">
        <div className="font-mono text-[10px] sm:text-xs text-bunker truncate">
          <span className="text-stratosphere">{fmt(currentTime)}</span> · {t(`stages.${currentStage}`)}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <LanguageSwitcher className="md:hidden" />
          <button onClick={() => setShowMixer(!showMixer)} className="px-3 py-2 font-mono text-[10px] border border-bunker/50 hover:border-stratosphere transition-all">
            {showMixer ? '✕' : '♪'} {t('common.mixer')}
          </button>
          <button
            onClick={toggleAudio}
            className={`px-3 sm:px-4 py-2 font-mono text-[10px] sm:text-xs border transition-all ${isPlaying ? 'border-flare text-flare bg-flare/10' : 'border-stratosphere text-stratosphere'}`}
          >
            {isPlaying ? `❚❚ ${t('common.pause')}` : `▶ ${t('common.play')}`}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showMixer && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="relative z-10 mb-6 sm:mb-8 overflow-hidden">
            <StemMixer />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-3xl mx-auto mb-6 sm:mb-8 p-4 sm:p-6 border border-stratosphere/30 bg-stratosphere/5">
          <div className="font-mono text-[10px] text-stratosphere mb-2 sm:mb-3">{t('hub.banner.label')}</div>
          <p className="font-mono text-[12px] sm:text-sm text-bone leading-relaxed">
            <RichText k="hub.banner.text" />
          </p>
        </motion.div>

        <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-display text-3xl md:text-4xl text-center mb-2">
          {t('hub.title')}
        </motion.h2>
        <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="font-mono text-xs sm:text-sm text-bunker text-center mb-8 sm:mb-12">
          {t('hub.subtitle')}
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {cards.map(c => (
            <motion.button
              key={c.id}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: c.delay }}
              onClick={() => goToSection(c.id)}
              whileHover={{ y: -8, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`group relative p-5 sm:p-8 border border-bunker/30 bg-void transition-all text-left overflow-hidden ${c.hover}`}
            >
              <div className={`absolute top-3 right-3 sm:top-4 sm:right-4 text-4xl sm:text-5xl opacity-20 group-hover:opacity-40 transition-opacity ${c.text}`} aria-hidden>
                {c.glyph}
              </div>
              <div className="relative z-10">
                <div className={`font-mono text-xs mb-2 ${c.text}`}>{t(`hub.${c.id}.num`)}</div>
                <h3 className="font-display text-2xl mb-3">{t(`hub.${c.id}.title`)}</h3>
                <p className="font-mono text-xs text-bone/80 mb-2 leading-relaxed">
                  <strong>{t(`hub.${c.id}.question`)}</strong>
                </p>
                <p className="font-mono text-xs text-bunker/70 mb-4 leading-relaxed">
                  <RichText k={`hub.${c.id}.text`} />
                </p>
                <div className={`flex items-center gap-2 group-hover:gap-4 transition-all ${c.text}`}>
                  <span className="font-mono text-xs">{t(`hub.${c.id}.cta`)}</span>
                  <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                    →
                  </motion.span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="mt-6 sm:mt-8 max-w-2xl mx-auto text-center">
          <p className="font-mono text-[11px] sm:text-xs text-bunker/60">
            💡 <RichText k="hub.tip" />
          </p>
        </motion.div>

        <Slot name="hubExtras" />

        {/* Audio visualization */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-10 sm:mt-12 p-4 border border-bunker/20 max-w-md mx-auto">
          <div className="font-mono text-[10px] text-bunker/50 mb-3 text-center">{t('hub.assemblage', { stage: t(`stages.${currentStage}`) })}</div>
          <div className="flex justify-center gap-1 h-12">
            {STEMS.map((stem, i) => {
              const isActive = activeLayers.includes(stem.layer)
              return (
                <motion.div key={stem.id} className={`w-6 flex flex-col items-center justify-end transition-all ${isActive ? 'opacity-100' : 'opacity-30'}`} title={t(`stems.${stem.id}`)}>
                  <motion.div
                    className={`w-4 ${isActive ? 'bg-stratosphere' : 'bg-bunker/50'}`}
                    animate={{ height: isActive && isPlaying ? [8, 20 + ((i * 7) % 20), 8] : 8 }}
                    transition={{ duration: 0.3 + (i % 3) * 0.1, repeat: Infinity }}
                  />
                  <div className="text-[7px] font-mono text-bunker mt-1">{t(`stems.${stem.id}`).slice(0, 2)}</div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Artist's statement — the long narration in the artist's voice */}
        <button
          onClick={() => narrator.play(lang, 'statement')}
          className="mt-6 max-w-md mx-auto w-full flex items-center gap-3 p-3 border border-bunker/30 hover:border-prismatic/50 bg-void/60 text-left transition-colors"
        >
          <span className="w-8 h-8 shrink-0 flex items-center justify-center border border-prismatic/40 text-prismatic" aria-hidden>
            ▶
          </span>
          <span className="min-w-0">
            <span className="block font-mono text-[10px] text-prismatic tracking-[0.3em]">{t('voice.statementTitle')}</span>
            <span className="block font-mono text-[10px] text-bunker truncate">{t('voice.statementHint')}</span>
          </span>
        </button>

        <OfferingBlock />
      </div>
    </motion.div>
  )
}

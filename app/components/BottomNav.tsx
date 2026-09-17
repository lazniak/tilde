'use client'

import { motion } from 'framer-motion'
import { useLiturgy } from '@/app/lib/LiturgyContext'
import { useI18n } from '@/app/lib/i18n/I18nProvider'
import { ASSEMBLAGE_STAGES } from '@/app/lib/constants'
import { NarratorToggle } from './Narrator'
import { OfferingLink } from './Offering'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Slot } from './Slot'

const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`

export function BottomNav() {
  const { screen, setScreen, goToSection, isPlaying, toggleAudio, currentTime, duration, currentStage } = useLiturgy()
  const { t } = useI18n()
  const activeLayers = [...ASSEMBLAGE_STAGES[currentStage].layers] as number[]

  const sections = [
    { id: 'genesis' as const, label: t('nav.genesis'), color: 'stratosphere' },
    { id: 'incarnation' as const, label: t('nav.incarnation'), color: 'flare' },
    { id: 'exegesis' as const, label: t('nav.exegesis'), color: 'prismatic' },
  ]
  const active: Record<string, string> = {
    stratosphere: 'border-stratosphere bg-stratosphere/10 text-stratosphere',
    flare: 'border-flare bg-flare/10 text-flare',
    prismatic: 'border-prismatic bg-prismatic/10 text-prismatic',
  }

  return (
    <motion.nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-void/95 backdrop-blur-md border-t border-bunker/30 liturgy-nav"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      aria-label="Liturgy navigation"
    >
      <div className="max-w-6xl mx-auto px-2 sm:px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex flex-col gap-2">
        {/* Row 1: sections + hub */}
        <div className="flex items-center gap-1">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => goToSection(s.id)}
              className={`flex-1 sm:flex-none px-2 sm:px-3 py-2 sm:py-1.5 font-mono text-[9px] sm:text-[10px] border transition-all truncate ${
                screen === s.id ? active[s.color] : 'border-bunker/30 text-bunker hover:text-bone hover:border-bunker'
              }`}
            >
              {s.label}
            </button>
          ))}
          <button
            onClick={() => setScreen('explore')}
            className={`px-2 sm:px-3 py-2 sm:py-1.5 border font-mono text-[9px] sm:text-[10px] transition-all flex items-center gap-1 ${
              screen === 'explore' ? 'border-bone/60 text-bone' : 'border-bunker/30 text-bunker hover:border-bone hover:text-bone'
            }`}
          >
            <span aria-hidden>◎</span>
            <span className="hidden sm:inline">{t('nav.hub')}</span>
          </button>

          {/* Desktop: audio + extras on the same row */}
          <div className="hidden sm:flex items-center gap-3 ml-auto">
            <AudioCluster />
          </div>
        </div>

        {/* Row 2 (mobile only): audio cluster */}
        <div className="flex sm:hidden items-center gap-2">
          <AudioCluster />
        </div>
      </div>

      {/* Audio progress bar */}
      <div className="h-0.5 bg-bunker/20">
        <div
          className="h-full bg-gradient-to-r from-stratosphere via-flare to-prismatic transition-[width] duration-200"
          style={{ width: `${Math.min(100, (currentTime / duration) * 100)}%` }}
        />
      </div>
      <span className="sr-only">
        {fmt(currentTime)} / {fmt(duration)} · {t(`stages.${currentStage}`)} · {isPlaying ? t('common.play') : t('common.pause')}
      </span>
      <LayerDots layers={activeLayers} />
    </motion.nav>
  )

  function AudioCluster() {
    return (
      <>
        <button
          onClick={toggleAudio}
          aria-label={isPlaying ? t('common.pause') : t('common.play')}
          className={`w-9 h-9 flex items-center justify-center border transition-all ${
            isPlaying ? 'border-flare bg-flare/10 text-flare' : 'border-bunker bg-void text-bunker hover:border-stratosphere hover:text-stratosphere'
          }`}
        >
          <span className="text-base leading-none">{isPlaying ? '❚❚' : '▶'}</span>
        </button>
        <div className="flex flex-col min-w-0 flex-1 sm:flex-none sm:min-w-[7rem]">
          <div className="font-mono text-[11px] text-bone leading-tight">
            {fmt(currentTime)} <span className="text-bunker/50">/ {fmt(duration)}</span>
          </div>
          <div className="font-mono text-[9px] text-bunker/60 truncate">{t(`stages.${currentStage}`)}</div>
        </div>
        <NarratorToggle />
        <Slot name="navExtras" />
        <OfferingLink />
        <LanguageSwitcher className="hidden md:inline-flex" />
      </>
    )
  }
}

function LayerDots({ layers }: { layers: number[] }) {
  return (
    <div className="absolute top-1 right-2 hidden lg:flex gap-0.5 items-center pointer-events-none" aria-hidden>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <div key={i} className={`w-1 h-3 ${layers.includes(i) ? 'bg-stratosphere' : 'bg-bunker/20'}`} />
      ))}
    </div>
  )
}

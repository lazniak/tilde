'use client'

import { useCallback, useRef } from 'react'
import { STEMS } from '@/app/lib/constants'
import { useLiturgy } from '@/app/lib/LiturgyContext'
import { useI18n } from '@/app/lib/i18n/I18nProvider'
import { ASSEMBLAGE_STAGES } from '@/app/lib/constants'

/**
 * Nine votive candles, one per stem. Drag vertically (mouse or touch) to set the level.
 * Inactive layers for the current stage are shown dim — they are silent until the
 * liturgy reaches their stage, but the level you set is remembered.
 */
export function StemMixer() {
  const { stemVolumes, adjustStemVolume, currentStage, isPlaying } = useLiturgy()
  const { t } = useI18n()
  const activeLayers = [...ASSEMBLAGE_STAGES[currentStage].layers] as number[]

  return (
    <div className="p-3 sm:p-4 border border-bunker/30 bg-void/60">
      <div className="font-mono text-[10px] text-bunker/60 mb-1">{t('hub.mixerTitle')}</div>
      <div className="font-mono text-[9px] text-bunker/40 mb-3">{t('hub.mixerHint')}</div>
      <div className="grid grid-cols-5 sm:grid-cols-9 gap-2">
        {STEMS.map(stem => (
          <Candle
            key={stem.id}
            label={t(`stems.${stem.id}`)}
            value={stemVolumes[stem.id] ?? 1}
            active={activeLayers.includes(stem.layer)}
            lit={isPlaying}
            onChange={v => adjustStemVolume(stem.id, v)}
          />
        ))}
      </div>
    </div>
  )
}

function Candle({ label, value, active, lit, onChange }: { label: string; value: number; active: boolean; lit: boolean; onChange: (v: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)

  const setFromPointer = useCallback(
    (clientY: number) => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const v = 1 - (clientY - rect.top) / rect.height
      onChange(Math.round(Math.max(0, Math.min(1, v)) * 20) / 20)
    },
    [onChange]
  )

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    setFromPointer(e.clientY)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.buttons === 0 && e.pointerType === 'mouse') return
    if (e.pointerType !== 'mouse' || e.buttons > 0) setFromPointer(e.clientY)
  }

  const pct = Math.round(value * 100)
  return (
    <div className="flex flex-col items-center select-none">
      <div className="font-mono text-[8px] sm:text-[9px] text-bunker mb-1 truncate max-w-full" title={label}>
        {label}
      </div>
      <div
        ref={ref}
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'ArrowUp') onChange(Math.min(1, value + 0.05))
          if (e.key === 'ArrowDown') onChange(Math.max(0, value - 0.05))
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        className={`relative w-7 h-24 border cursor-ns-resize touch-none transition-colors ${
          active ? 'border-stratosphere/60' : 'border-bunker/30'
        }`}
        style={{ touchAction: 'none' }}
      >
        {/* wax */}
        <div
          className={`absolute left-0 right-0 bottom-0 transition-[height] duration-100 ${active ? 'bg-bone/70' : 'bg-bunker/30'}`}
          style={{ height: `${pct}%` }}
        />
        {/* flame */}
        {active && lit && value > 0 && (
          <div
            className="absolute left-1/2 -translate-x-1/2 w-1.5 h-2.5 rounded-full bg-flare animate-pulse"
            style={{ bottom: `calc(${pct}% + 1px)`, boxShadow: '0 0 8px 3px rgba(217,108,44,0.4)' }}
          />
        )}
      </div>
      <div className={`font-mono text-[9px] mt-1 ${active ? 'text-stratosphere' : 'text-bunker/50'}`}>{pct}%</div>
    </div>
  )
}

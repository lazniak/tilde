'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useLiturgy } from '@/app/lib/LiturgyContext'
import { useI18n } from '@/app/lib/i18n/I18nProvider'
import { DRAMATURGY, VIDEO_CLIPS, VIDEO_PROMPTS } from '@/app/lib/constants'

/**
 * LATENT MAP — the 65 surviving clips plotted as a constellation.
 *
 * x = where the clip sits in the 198 s montage, y = "attractor proximity": a
 * transparent, hand-written heuristic for how hard each shot pulls toward the
 * face the prompt never asked for. No model is consulted; the arithmetic is
 * printed under the map so a visitor can disagree with it.
 */

const FACE_WORDS = /close[- ]?up|face|eye|profile|portrait|scream/i

const VIEW_W = 1000
const PAD_L = 34
const PAD_R = 14
const PAD_T = 44
const PAD_B = 34
const TIME_MAX = 198

export interface MapPoint {
  index: number
  file: string
  thumb: string
  start: number
  proximity: number
  hasFace: boolean
  prism: boolean
  closeUp: boolean
}

function startSeconds(range: string | undefined, fallback: number): number {
  const m = /^\s*(\d+(?:\.\d+)?)\s*s/.exec(range ?? '')
  return m ? parseFloat(m[1]) : fallback
}

/** Deterministic 0…1 from a clip index — the same dot lands in the same place forever. */
function jitter(index: number): number {
  const x = Math.sin((index + 1) * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

export function buildPoints(): MapPoint[] {
  return VIDEO_CLIPS.map(clip => {
    const p = VIDEO_PROMPTS[clip.index]
    const assets = p?.assets ?? []
    const hasFace = assets.includes('Woman_The_Medium')
    const closeUp = FACE_WORDS.test(p?.description ?? '')
    const prism = assets.includes('Prop_Prism_Lens')

    let proximity = 0
    if (hasFace) proximity += 0.5
    if (closeUp) proximity += 0.25
    if (prism) proximity += 0.1
    if (!hasFace) proximity -= 0.2
    proximity += (jitter(clip.index) - 0.5) * 0.08
    proximity = Math.max(0, Math.min(1, proximity))

    return {
      index: clip.index,
      file: clip.file,
      thumb: clip.thumb,
      start: startSeconds(p?.scene_timerange, clip.index * 3),
      proximity,
      hasFace,
      prism,
      closeUp,
    }
  })
}

const xFor = (seconds: number) => PAD_L + (Math.min(seconds, TIME_MAX) / TIME_MAX) * (VIEW_W - PAD_L - PAD_R)
const yFor = (proximity: number, h: number) => h - PAD_B - proximity * (h - PAD_T - PAD_B)

export function LatentMap() {
  const { consentGiven, reducedMotion } = useLiturgy()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<number | null>(null)
  // Phones get a taller viewBox so the constellation keeps its vertical spread
  // (and its dots stay circles) instead of collapsing into a thin ribbon.
  const [narrow, setNarrow] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const sync = () => setNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const viewH = narrow ? 640 : 420
  const points = useMemo(buildPoints, [])
  const bands = useMemo(() => {
    const rows = DRAMATURGY.filter(d => d.time <= TIME_MAX)
    return rows.map((d, i) => {
      const from = d.time
      const to = i + 1 < rows.length ? Math.min(rows[i + 1].time, TIME_MAX) : TIME_MAX
      return { from, to, event: d.event }
    })
  }, [])

  const selected = active === null ? null : points.find(p => p.index === active) ?? null
  const attractors = points.filter(p => p.proximity >= 0.6).length

  const select = (index: number) => {
    setActive(index)
    window.dispatchEvent(new CustomEvent('liturgy:select-clip', { detail: { index } }))
  }

  return (
    <section className="mx-3 sm:mx-4 my-4 border border-stratosphere/30 bg-stratosphere/5">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-3 sm:px-4 py-3 text-left min-h-[44px]"
      >
        <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-stratosphere">{t('archaeology.map.label')}</span>
        <span className="font-mono text-[10px] text-bunker shrink-0">{open ? t('archaeology.common.collapse') : t('archaeology.common.expand')}</span>
      </button>

      {open && (
        <div className="px-3 sm:px-4 pb-4">
          <p className="font-mono text-[11px] text-bone/70 leading-relaxed mb-3">{t('archaeology.map.intro')}</p>

          <div className="border border-bunker/20 bg-void/60 p-1">
            <svg
              viewBox={`0 0 ${VIEW_W} ${viewH}`}
              className="w-full h-auto min-h-[260px] block"
              role="group"
              aria-label={t('archaeology.map.label')}
            >
              {/* dramaturgy phase bands */}
              {bands.map((b, i) => {
                const x0 = xFor(b.from)
                const w = Math.max(0, xFor(b.to) - x0)
                return (
                  <g key={b.event}>
                    <rect x={x0} y={PAD_T - 20} width={w} height={viewH - PAD_B - PAD_T + 20} fill="#1C3F94" opacity={0.04 + (i % 2) * 0.05} />
                    <line x1={x0} y1={PAD_T - 20} x2={x0} y2={viewH - PAD_B} stroke="#8C929D" strokeWidth={1} opacity={0.18} />
                    {w > 70 && (
                      <text x={x0 + 6} y={PAD_T - 26} fill="#8C929D" opacity={0.75} fontSize={12} fontFamily="monospace" letterSpacing={1}>
                        {b.event}
                      </text>
                    )}
                  </g>
                )
              })}

              {/* axes */}
              <line x1={PAD_L} y1={viewH - PAD_B} x2={VIEW_W - PAD_R} y2={viewH - PAD_B} stroke="#8C929D" strokeWidth={1} opacity={0.35} />
              <line x1={PAD_L} y1={PAD_T - 20} x2={PAD_L} y2={viewH - PAD_B} stroke="#8C929D" strokeWidth={1} opacity={0.35} />
              {[0, 0.5, 1].map(v => (
                <g key={v}>
                  <line
                    x1={PAD_L}
                    y1={yFor(v, viewH)}
                    x2={VIEW_W - PAD_R}
                    y2={yFor(v, viewH)}
                    stroke="#8C929D"
                    strokeWidth={1}
                    opacity={0.12}
                    strokeDasharray="2 6"
                  />
                  <text x={2} y={yFor(v, viewH) + 4} fill="#8C929D" opacity={0.8} fontSize={12} fontFamily="monospace">
                    {v.toFixed(1)}
                  </text>
                </g>
              ))}
              {[0, 66, 132, 198].map(s => (
                <text key={s} x={xFor(s)} y={viewH - PAD_B + 22} fill="#8C929D" opacity={0.8} fontSize={12} fontFamily="monospace" textAnchor="middle">
                  {s}s
                </text>
              ))}

              {/* clips */}
              {points.map(p => {
                const cx = xFor(p.start)
                const cy = yFor(p.proximity, viewH)
                const r = 4 + p.proximity * 11
                const isActive = active === p.index
                const fill = p.proximity >= 0.6 ? '#E0FFFF' : '#1C3F94'
                return (
                  <g
                    key={p.index}
                    role="button"
                    tabIndex={0}
                    aria-label={t('archaeology.map.pointLabel', {
                      file: p.file,
                      second: Math.round(p.start),
                      proximity: p.proximity.toFixed(2),
                    })}
                    onClick={() => select(p.index)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        select(p.index)
                      }
                    }}
                    onMouseEnter={() => setActive(p.index)}
                    onFocus={() => setActive(p.index)}
                    className="cursor-pointer outline-none"
                  >
                    {/* generous invisible hit area — comfortably past 36 px once scaled down */}
                    <circle cx={cx} cy={cy} r={Math.max(r + 10, 18)} fill="transparent" />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={p.hasFace ? fill : 'none'}
                      fillOpacity={p.hasFace ? 0.5 : 0}
                      stroke={fill}
                      strokeWidth={isActive ? 3 : p.hasFace ? 1 : 1.5}
                      strokeOpacity={isActive ? 1 : 0.7}
                    />
                    {isActive && <circle cx={cx} cy={cy} r={r + 7} fill="none" stroke="#D96C2C" strokeWidth={1.5} strokeOpacity={0.9} />}
                  </g>
                )
              })}
            </svg>
          </div>

          {/* selected clip card */}
          <div className="mt-3 min-h-[92px]">
            {selected ? (
              <motion.div
                key={selected.index}
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 p-3 border border-flare/30 bg-void/60"
              >
                <div className="w-16 h-16 shrink-0 border border-bunker/30 overflow-hidden relative">
                  <div
                    className={`absolute inset-0 bg-cover bg-center ${consentGiven ? '' : 'blur-2xl'}`}
                    style={{ backgroundImage: `url(${selected.thumb})` }}
                    aria-hidden
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[11px] text-flare truncate">{selected.file}</div>
                  <div className="font-mono text-[9px] text-bunker/70">
                    {t('archaeology.map.cardMeta', { second: Math.round(selected.start), proximity: selected.proximity.toFixed(2) })}
                  </div>
                  <p className="font-mono text-[10px] text-bone/70 mt-1 leading-relaxed">
                    {(VIDEO_PROMPTS[selected.index]?.description ?? '').slice(0, 140)}…
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="p-3 border border-bunker/20 bg-void/40 font-mono text-[10px] text-bunker/60">{t('archaeology.map.hint')}</div>
            )}
          </div>

          {/* legend */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[9px] text-bunker/70">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 bg-prismatic/60 border border-prismatic" aria-hidden /> {t('archaeology.map.legendAttractor')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 bg-stratosphere/60 border border-stratosphere" aria-hidden /> {t('archaeology.map.legendNear')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 border border-stratosphere" aria-hidden /> {t('archaeology.map.legendNoFace')}
            </span>
            <span>{t('archaeology.map.tally', { attractors, total: points.length })}</span>
          </div>
          <div className="mt-2 font-mono text-[9px] text-bunker/50 leading-relaxed">{t('archaeology.map.formula')}</div>
        </div>
      )}
    </section>
  )
}

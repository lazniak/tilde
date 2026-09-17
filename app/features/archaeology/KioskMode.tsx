'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLiturgy, type Screen } from '@/app/lib/LiturgyContext'
import { useI18n } from '@/app/lib/i18n/I18nProvider'
import { narrator } from '@/app/components/Narrator'
import { SITE_URL } from '@/app/lib/constants'
import { encodeQr, qrPath } from './qr'

/**
 * KIOSK — for the gallery wall, not for phones.
 *
 * Goes fullscreen, hides the chrome, and walks the four panels on a 45 s loop,
 * holding still whenever the narrator is speaking. A QR code (encoded here, no
 * dependency) lets a visitor carry the piece home in their own language.
 */

const CYCLE: Screen[] = ['explore', 'genesis', 'incarnation', 'exegesis']
const CYCLE_MS = 45_000
const STYLE_ID = 'archaeology-kiosk-style'

/** Injected only while kiosk is active — the package may not touch globals.css. */
const KIOSK_CSS = `
body.kiosk .liturgy-nav { display: none !important; }
body.kiosk select { display: none !important; }
body.kiosk { font-size: 108%; }
`

function QrCode({ text, size = 120 }: { text: string; size?: number }) {
  const matrix = useMemo(() => encodeQr(text), [text])
  if (!matrix) return null
  const quiet = 4
  const span = matrix.size + quiet * 2
  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-quiet} ${-quiet} ${span} ${span}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={text}
      className="block"
    >
      <rect x={-quiet} y={-quiet} width={span} height={span} fill="#F2F0E4" />
      <path d={qrPath(matrix)} fill="#050505" />
    </svg>
  )
}

export function KioskButton() {
  const { goToSection, isTouch } = useLiturgy()
  const { t, lang } = useI18n()
  const [active, setActive] = useState(false)
  const [mounted, setMounted] = useState(false)
  const stepRef = useRef(0)

  useEffect(() => setMounted(true), [])

  const stop = useCallback(() => {
    setActive(false)
  }, [])

  const start = useCallback(() => {
    stepRef.current = 0
    setActive(true)
    try {
      void document.documentElement.requestFullscreen?.().catch(() => undefined)
    } catch {
      /* fullscreen may be blocked — kiosk still works */
    }
  }, [])

  // Body class + injected stylesheet, torn down on exit.
  useEffect(() => {
    if (!active) return
    document.body.classList.add('kiosk')
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
    if (!style) {
      style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = KIOSK_CSS
      document.head.appendChild(style)
    }
    return () => {
      document.body.classList.remove('kiosk')
      document.getElementById(STYLE_ID)?.remove()
    }
  }, [active])

  // Section cycling — paused while the narrator speaks.
  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => {
      if (narrator.isPlaying()) return // hold; the next tick will move on
      stepRef.current = (stepRef.current + 1) % CYCLE.length
      goToSection(CYCLE[stepRef.current])
    }, CYCLE_MS)
    return () => clearInterval(timer)
  }, [active, goToSection])

  // Escape, and leaving fullscreen by any other route, ends the kiosk.
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stop()
    }
    const onFs = () => {
      if (!document.fullscreenElement) stop()
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('fullscreenchange', onFs)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('fullscreenchange', onFs)
    }
  }, [active, stop])

  const exit = useCallback(() => {
    stop()
    try {
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined)
    } catch {
      /* ignore */
    }
  }, [stop])

  // Touch devices are phones and tablets — a wall kiosk is neither.
  if (isTouch) return null

  const url = `${SITE_URL}?lang=${lang}`

  return (
    <>
      <button
        onClick={active ? exit : start}
        title={t('archaeology.kiosk.hint')}
        aria-pressed={active}
        className={`h-9 px-2 flex items-center gap-1.5 border font-mono text-[10px] tracking-[0.2em] transition-colors ${
          active ? 'border-flare text-flare bg-flare/10' : 'border-bunker/30 text-bunker hover:border-prismatic hover:text-prismatic'
        }`}
      >
        <span aria-hidden>▣</span>
        <span className="hidden lg:inline">{t('archaeology.kiosk.button')}</span>
      </button>

      {mounted &&
        active &&
        createPortal(
          <div className="fixed left-4 bottom-4 z-[70] p-3 border border-bunker/40 bg-void/95 backdrop-blur-sm flex items-start gap-3">
            <QrCode text={url} size={120} />
            <div className="flex flex-col justify-between self-stretch max-w-[11rem]">
              <div>
                <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-prismatic leading-relaxed">{t('archaeology.kiosk.scan')}</div>
                <div className="font-mono text-[9px] text-bunker/60 mt-1 break-all ltr" dir="ltr">
                  {url}
                </div>
              </div>
              <button
                onClick={exit}
                className="mt-3 self-start min-h-[36px] px-3 py-2 border border-bunker/50 hover:border-flare hover:text-flare font-mono text-[10px] tracking-[0.25em] text-bunker transition-colors"
              >
                {t('archaeology.kiosk.exit')}
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}

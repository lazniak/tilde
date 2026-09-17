'use client'

import { useEffect, useRef, useState } from 'react'
import { useLiturgy } from '@/app/lib/LiturgyContext'
import { acquireField, isShaderDegraded, releaseField } from './shaderField'

/**
 * Audio-reactive replacement for the core AmbientBackground.
 *
 * Layers, bottom to top:
 *   1. the screen's ambient still at 4 % (plain <div>, no GL texture needed)
 *   2. the WebGL2 field at 14 % — slow flowing stratosphere / flare / prismatic
 *      noise whose speed and brightness follow the soundtrack's bass and mids
 *   3. a vignette, so body copy keeps its contrast (as in the core background)
 *
 * Falls back to layers 1 + 3 alone when WebGL2 is missing or the visitor asked
 * for reduced motion.
 */
export function ShaderBackground() {
  const { screen, bgImages, reducedMotion, isTouch } = useLiturgy()
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    if (reducedMotion || isShaderDegraded()) {
      setLive(false)
      return
    }
    const host = hostRef.current
    if (!host) return
    let disposed = false
    const ok = acquireField(host, {
      halfRes: isTouch,
      onLost: () => {
        if (!disposed) setLive(false)
      },
    })
    setLive(ok)
    return () => {
      disposed = true
      releaseField(host)
    }
  }, [reducedMotion, isTouch])

  const image = bgImages[screen]

  return (
    <div className="fixed inset-0 pointer-events-none z-0" aria-hidden>
      {image ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${image})`, opacity: 0.04 }}
        />
      ) : null}
      <div
        ref={hostRef}
        className="absolute inset-0 overflow-hidden"
        style={{ opacity: live ? 0.14 : 0, transition: 'opacity 1.2s linear' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, rgba(5,5,5,0) 0%, rgba(5,5,5,0.55) 100%)' }}
      />
    </div>
  )
}

export default ShaderBackground

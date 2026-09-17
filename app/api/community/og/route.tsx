/* eslint-disable @next/next/no-img-element */
// Dynamic Open Graph cards for the liturgy. 1200x630, house palette, Cormorant + JetBrains Mono.
//
//   /api/community/og                       -> the central question
//   /api/community/og?type=clip&i=7         -> dimmed scene still behind the question
//   /api/community/og?type=testimony&id=... -> one visitor sentence
//
// Edge runtime: the Node build of @vercel/og cannot resolve its bundled fallback font on
// Windows (ERR_INVALID_URL on a `.\file:\D:\...` path), which kills every render in dev.
// Being on the edge means no `fs`, so the testimony comes from GET /api/community/testimony
// and the scene still from /eon/… — both fetched against this request's own origin.

import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

const BONE = '#F2F0E4'
const VOID = '#050505'
const BUNKER = '#8C929D'
const STRATOSPHERE = '#1C3F94'
const FLARE = '#D96C2C'
const PRISMATIC = '#E0FFFF'

const QUESTION = 'Why did "transformation" and "eternity" become her face?'
const TITLE = 'The Latent Liturgy'
const PUBLIC_ORIGIN = 'https://eon.pablogfx.com'
const MAX_TEXT = 200
const MAX_CLIP_INDEX = 70

/** Trim, strip control characters, cap length. (security.ts pulls in node:crypto, which edge cannot load.) */
function sanitize(value: unknown, max = MAX_TEXT): string {
  if (typeof value !== 'string') return ''
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
}

/* ------------------------------------------------------------------- fonts */

interface LoadedFont {
  name: string
  data: ArrayBuffer
  weight: 400 | 600
  style: 'normal'
}

let fontsPromise: Promise<LoadedFont[]> | null = null

async function fetchTtf(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`
    // Without a browser User-Agent the Google Fonts API answers with TTF sources,
    // which is what satori can parse (it cannot read WOFF2).
    const css = await fetch(url, { signal: AbortSignal.timeout(6000) }).then(r => (r.ok ? r.text() : ''))
    const match = css.match(/src:\s*url\((https:[^)]+)\)\s*format\('truetype'\)/)
    if (!match) return null
    const res = await fetch(match[1], { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return null
    return await res.arrayBuffer()
  } catch {
    return null
  }
}

/** Cached in module scope: fetched once per process; a failure just falls back to system fonts. */
async function houseFonts(): Promise<LoadedFont[]> {
  if (!fontsPromise) {
    fontsPromise = (async () => {
      const [serif, mono] = await Promise.all([
        fetchTtf('Cormorant Garamond', 600),
        fetchTtf('JetBrains Mono', 400),
      ])
      const out: LoadedFont[] = []
      if (serif) out.push({ name: 'Cormorant Garamond', data: serif, weight: 600, style: 'normal' })
      if (mono) out.push({ name: 'JetBrains Mono', data: mono, weight: 400, style: 'normal' })
      return out
    })().catch(() => [])
  }
  return fontsPromise
}

/* ------------------------------------------------------------------ scenes */

const sceneCache = new Map<number, string | null>()

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunk)))
  }
  return btoa(binary)
}

/** Scene still as a data URI: this origin first, the public site as fallback. */
async function sceneImage(index: number, origin: string): Promise<string | null> {
  if (sceneCache.has(index)) return sceneCache.get(index) ?? null
  const name = `eon_scene_${index.toString().padStart(3, '0')}.png`
  let uri: string | null = null
  for (const base of [origin, PUBLIC_ORIGIN]) {
    try {
      const res = await fetch(`${base}/eon/${name}`, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) continue
      uri = `data:image/png;base64,${toBase64(await res.arrayBuffer())}`
      break
    } catch {
      /* try the next base */
    }
  }
  if (sceneCache.size > 12) sceneCache.clear()
  sceneCache.set(index, uri)
  return uri
}

/* -------------------------------------------------------------- testimony */

interface PublicTestimony {
  id: string
  text: string
  name: string
  lang: string
}

async function fetchTestimony(id: string, origin: string): Promise<PublicTestimony | null> {
  try {
    const res = await fetch(`${origin}/api/community/testimony?id=${encodeURIComponent(id)}`, {
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = (await res.json()) as { testimony?: PublicTestimony }
    return data.testimony ?? null
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ render */

const label = (color: string) => ({
  fontFamily: 'JetBrains Mono',
  fontSize: 20,
  letterSpacing: 6,
  color,
})

function headlineSize(text: string): number {
  if (text.length > 150) return 44
  if (text.length > 100) return 54
  if (text.length > 60) return 66
  return 78
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const origin = request.nextUrl.origin
  const type = params.get('type') || 'default'

  let kicker = 'A TRIPTYCH OF ALGORITHMIC FATE'
  let headline = QUESTION
  let byline = TITLE
  let accent = STRATOSPHERE
  let background: string | null = null

  if (type === 'clip') {
    const raw = (params.get('i') ?? '').trim()
    const index = Number.parseInt(raw, 10)
    if (!/^\d{1,3}$/.test(raw) || !Number.isInteger(index) || index < 0 || index > MAX_CLIP_INDEX) {
      return new Response('Bad clip index', { status: 400 })
    }
    background = await sceneImage(index, origin)
    accent = FLARE
    kicker = `// CLIP ${index.toString().padStart(3, '0')} - 68 CLIPS, ONE FACE`
  } else if (type === 'testimony') {
    const id = sanitize(params.get('id'), 40)
    const row = id ? await fetchTestimony(id, origin) : null
    if (!row) return new Response('Not found', { status: 404 })
    accent = PRISMATIC
    kicker = '// TESTIMONY - WHOSE FACE IS IT?'
    headline = sanitize(row.text)
    const who = sanitize(row.name, 40)
    const lang = sanitize(row.lang, 8).toUpperCase()
    byline = who ? `${who} / ${lang}` : `ANONYMOUS / ${lang}`
  }

  headline = sanitize(headline)
  kicker = sanitize(kicker).toUpperCase()
  byline = sanitize(byline).toUpperCase()

  const fonts = await houseFonts()

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          backgroundColor: VOID,
          color: BONE,
          fontFamily: 'JetBrains Mono',
        }}
      >
        {background ? (
          <img
            src={background}
            width={1200}
            height={630}
            alt=""
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 1200,
              height: 630,
              objectFit: 'cover',
              opacity: 0.28,
            }}
          />
        ) : null}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: 'flex',
            background: 'linear-gradient(180deg, rgba(5,5,5,0.5) 0%, rgba(5,5,5,0.88) 100%)',
          }}
        />

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: 1200,
            height: 630,
            padding: 64,
            borderTop: `6px solid ${accent}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: 1072 }}>
            <div style={{ ...label(accent), display: 'flex' }}>{kicker}</div>
            <div style={{ ...label(BUNKER), display: 'flex' }}>EON.PABLOGFX.COM</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', width: 1072 }}>
            <div
              style={{
                display: 'flex',
                fontFamily: 'Cormorant Garamond',
                fontSize: headlineSize(headline),
                lineHeight: 1.12,
                color: BONE,
              }}
            >
              {headline}
            </div>
            <div style={{ display: 'flex', width: 120, height: 2, marginTop: 28, backgroundColor: accent }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: 1072 }}>
            <div style={{ ...label(BONE), display: 'flex', letterSpacing: 4 }}>{byline}</div>
            <div style={{ ...label(BUNKER), display: 'flex', fontSize: 18, letterSpacing: 3 }}>P.LAZNIAK</div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      ...(fonts.length ? { fonts } : {}),
      headers: { 'Cache-Control': 'public, max-age=86400' },
    }
  )
}

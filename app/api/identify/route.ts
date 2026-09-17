import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { checkRateLimit, getClientIP, getRateLimitHeaders } from '@/app/lib/rateLimit'
import { LlmError, VISION_MODEL, complete } from '@/app/lib/llm'
import { gate } from '@/app/lib/security'
import { bumpCounter } from '@/app/lib/store'
import { getLocale, LOCALE_CODES } from '@/app/lib/i18n/config'

export const dynamic = 'force-dynamic'

// Stricter rate limit for image analysis: 3 requests per minute, 20 per day
const RATE_LIMIT_CONFIG = {
  maxRequests: 3,
  windowMs: 60 * 1000,
  dailyMax: 20,
}

/**
 * Only images that ship with the project may be analysed. The previous version accepted an
 * arbitrary URL and fetched it server-side (SSRF). Now the client sends an asset key.
 */
const ASSETS: Record<string, string> = {
  woman: 'asset_Woman_The_Medium.png',
  scene_002: 'eon_scene_002.png',
  scene_013: 'eon_scene_013.png',
  scene_026: 'eon_scene_026.png',
  scene_041: 'eon_scene_041.png',
  scene_065: 'eon_scene_065.png',
}

const RECOGNISED = /tilda|swinton/i

export async function POST(request: NextRequest) {
  const blocked = gate(request)
  if (blocked) return blocked

  const clientIP = getClientIP(request)
  const rateLimitResult = checkRateLimit(clientIP, { ...RATE_LIMIT_CONFIG, identifier: `identify_${clientIP}` })

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many identification requests. Please wait before analyzing again.', retryAfter: rateLimitResult.retryAfter },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult, RATE_LIMIT_CONFIG.maxRequests) }
    )
  }

  try {
    const payload = (await request.json().catch(() => ({}))) as { asset?: unknown; lang?: unknown }
    const assetKey = typeof payload.asset === 'string' && payload.asset in ASSETS ? payload.asset : 'woman'
    const lang = typeof payload.lang === 'string' && LOCALE_CODES.includes(payload.lang) ? payload.lang : 'en'
    const langName = getLocale(lang).llm

    const file = path.join(process.cwd(), 'public', 'eon', ASSETS[assetKey])
    const buffer = await fs.readFile(file)
    const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`

    const text = await complete(
      [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUrl } },
            {
              type: 'text',
              text: `Analyze this image carefully. Does this image depict a recognizable public figure, celebrity, or known person? If so, who does this person resemble and why might they be recognizable? Provide a detailed analysis of the facial features and any distinctive characteristics that lead to your conclusion. Be specific and analytical. Answer in ${langName}. Keep proper names in their original spelling.`,
            },
          ],
        },
      ],
      { model: VISION_MODEL, temperature: 0.4, maxTokens: 900 }
    )

    const recognised = RECOGNISED.test(text)
    // Public tally for the "attractor counter": how often the model itself names her.
    const [total, hits] = await Promise.all([bumpCounter('identify_total'), recognised ? bumpCounter('identify_recognised') : Promise.resolve(undefined)])

    return NextResponse.json(
      { response: text || 'No response generated', model: VISION_MODEL, asset: ASSETS[assetKey], recognised, tally: { total, recognised: hits } },
      { headers: getRateLimitHeaders(rateLimitResult, RATE_LIMIT_CONFIG.maxRequests) }
    )
  } catch (error) {
    const status = error instanceof LlmError ? (error.status >= 500 ? 502 : error.status) : 500
    console.error('Identify API error:', error)
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status })
  }
}

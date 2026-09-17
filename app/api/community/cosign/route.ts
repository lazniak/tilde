// CO-SIGN THE LETTER TO TILDA SWINTON
// POST one signature per visitor per day (deduped by hashed IP) · GET the count and the last 12 display names.

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIP, getRateLimitHeaders } from '@/app/lib/rateLimit'
import { cleanText, gate } from '@/app/lib/security'
import {
  COSIGN_CITY_MAX,
  COSIGN_NAME_MAX,
  addCosign,
  cosignSummary,
  displayName,
  hasSigned,
  hashIp,
  rejectReason,
} from '@/app/features/community/lib/data'

export const dynamic = 'force-dynamic'

const RATE_LIMIT_CONFIG = {
  maxRequests: 1,
  windowMs: 24 * 60 * 60 * 1000,
  dailyMax: 1,
}

export async function GET() {
  try {
    const summary = await cosignSummary()
    return NextResponse.json(summary, { headers: { 'Cache-Control': 'public, max-age=30' } })
  } catch (e) {
    console.error('cosign GET failed:', e)
    return NextResponse.json({ error: 'The register is unreadable right now.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const blocked = gate(request)
  if (blocked) return blocked

  const ipHash = hashIp(getClientIP(request))

  try {
    const payload = (await request.json()) as { name?: unknown; city?: unknown; consent?: unknown }
    const name = cleanText(payload.name, COSIGN_NAME_MAX).replace(/\s+/g, ' ')
    const city = cleanText(payload.city, COSIGN_CITY_MAX).replace(/\s+/g, ' ')

    if (payload.consent !== true) {
      return NextResponse.json({ error: 'Tick the box to sign as yourself.', code: 'consent' }, { status: 400 })
    }
    if (name.length < 2) {
      return NextResponse.json({ error: 'A signature needs a name.', code: 'name' }, { status: 400 })
    }
    if (rejectReason(name) || (city && rejectReason(city))) {
      return NextResponse.json({ error: 'Names only — no links, no insults.', code: 'rejected' }, { status: 422 })
    }
    if (await hasSigned(ipHash)) {
      return NextResponse.json({ error: 'This device has already signed.', code: 'duplicate' }, { status: 409 })
    }

    // Counted only for well-formed signatures, so a missing checkbox never costs the day.
    const limit = checkRateLimit(ipHash, { ...RATE_LIMIT_CONFIG, identifier: `cosign:${ipHash}` })
    if (!limit.success) {
      return NextResponse.json(
        { error: 'You have already signed today.', code: 'rate', retryAfter: limit.retryAfter },
        { status: 429, headers: getRateLimitHeaders(limit, RATE_LIMIT_CONFIG.maxRequests) }
      )
    }

    await addCosign({ name, city, ipHash })
    const summary = await cosignSummary()
    return NextResponse.json(
      { ok: true, display: displayName(name), ...summary },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e) {
    console.error('cosign POST failed:', e)
    return NextResponse.json({ error: 'The register refused the signature. Try again.' }, { status: 500 })
  }
}

// TESTIMONY WALL — "whose face is it?"
// POST  one sentence (gated, rate limited, filtered) · GET latest approved · DELETE hides one (moderator token).

import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIP, getRateLimitHeaders } from '@/app/lib/rateLimit'
import { cleanText, gate } from '@/app/lib/security'
import { LOCALE_CODES } from '@/app/lib/i18n/config'
import {
  FEED_LIMIT,
  TESTIMONY_MAX,
  TESTIMONY_NAME_MAX,
  addTestimony,
  approvedTestimonies,
  getTestimony,
  hashIp,
  hideTestimony,
  isDuplicateTestimony,
  moderationMode,
  rejectReason,
} from '@/app/features/community/lib/data'

export const dynamic = 'force-dynamic'

const RATE_LIMIT_CONFIG = {
  maxRequests: 2,
  windowMs: 60 * 1000,
  dailyMax: 3,
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

/** Public shape — no ipHash, ever. */
function publicRow(r: { id: string; ts: number; text: string; name: string; lang: string }) {
  return { id: r.id, ts: r.ts, text: r.text, name: r.name, lang: r.lang }
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  try {
    if (id) {
      const row = await getTestimony(id)
      if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json(
        { testimony: publicRow(row) },
        { headers: { 'Cache-Control': 'public, max-age=30' } }
      )
    }
    const rows = await approvedTestimonies(FEED_LIMIT)
    return NextResponse.json(
      { testimonies: rows.map(publicRow), total: rows.length },
      { headers: { 'Cache-Control': 'public, max-age=30' } }
    )
  } catch (e) {
    console.error('testimony GET failed:', e)
    return NextResponse.json({ error: 'The wall is unreadable right now.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const blocked = gate(request)
  if (blocked) return blocked

  const ipHash = hashIp(getClientIP(request))

  try {
    const payload = (await request.json()) as { text?: unknown; name?: unknown; lang?: unknown }
    const text = cleanText(payload.text, TESTIMONY_MAX).replace(/\s+/g, ' ')
    const name = cleanText(payload.name, TESTIMONY_NAME_MAX).replace(/\s+/g, ' ')
    const lang = typeof payload.lang === 'string' && LOCALE_CODES.includes(payload.lang) ? payload.lang : 'en'

    if (text.length < 3) {
      return NextResponse.json({ error: 'Say something.', code: 'empty' }, { status: 400 })
    }

    const reason = rejectReason(text)
    if (reason) {
      return NextResponse.json(
        { error: 'This wall holds sentences, not links or insults.', code: reason },
        { status: 422 }
      )
    }

    if (await isDuplicateTestimony(ipHash, text)) {
      return NextResponse.json({ error: 'You already said that.', code: 'duplicate' }, { status: 409 })
    }

    // Counted only for well-formed offerings, so a typo never burns the daily quota.
    const limit = checkRateLimit(ipHash, { ...RATE_LIMIT_CONFIG, identifier: `testimony:${ipHash}` })
    if (!limit.success) {
      return NextResponse.json(
        {
          error:
            limit.reason === 'daily'
              ? 'You have spoken enough today. The wall keeps your words.'
              : 'Too fast. Let the litany breathe.',
          code: 'rate',
          retryAfter: limit.retryAfter,
        },
        { status: 429, headers: getRateLimitHeaders(limit, RATE_LIMIT_CONFIG.maxRequests) }
      )
    }

    const rec = await addTestimony({ text, name, lang, ipHash })
    return NextResponse.json(
      { testimony: publicRow(rec), status: rec.status, moderation: moderationMode() },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e) {
    console.error('testimony POST failed:', e)
    return NextResponse.json({ error: 'The wall refused the offering. Try again.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const expected = process.env.MOD_TOKEN
  const given = request.headers.get('x-mod-token')
  if (!expected || !given || !constantTimeEqual(given, expected)) {
    return NextResponse.json({ error: 'Not a moderator.' }, { status: 401 })
  }
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })
  try {
    const changed = await hideTestimony(id)
    if (!changed) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    return NextResponse.json({ ok: true, id, status: 'hidden' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('testimony DELETE failed:', e)
    return NextResponse.json({ error: 'Moderation failed.' }, { status: 500 })
  }
}

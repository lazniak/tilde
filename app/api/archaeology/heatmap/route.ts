import { NextRequest, NextResponse } from 'next/server'
import { CHAT_MODEL, LlmError, complete } from '@/app/lib/llm'
import { gate } from '@/app/lib/security'
import { checkRateLimit, getClientIP, getRateLimitHeaders } from '@/app/lib/rateLimit'
import { appendRecord, readRecords, type Record_ } from '@/app/lib/store'
import { PAUL_PROMPT } from '@/app/lib/constants'
import { LOCALE_CODES, getLocale } from '@/app/lib/i18n/config'

export const dynamic = 'force-dynamic'

/**
 * ATTENTION ARCHAEOLOGY — ask the model which fragments of Paul's prompt would
 * drag a diffusion system toward an ageless, androgynous, pale, high-cheekboned
 * face. One answer per language is cached forever in the store; the LLM is only
 * paid for the first visitor who asks in a given language.
 */

const COLLECTION = 'heatmaps'

const RATE_LIMIT = {
  maxRequests: 2,
  windowMs: 60 * 1000,
  dailyMax: 5,
}

const MIN_PHRASES = 12
const MAX_PHRASES = 18
const MAX_REASON_CHARS = 180
const MAX_SUMMARY_CHARS = 600

export interface HeatPhrase {
  phrase: string
  weight: number
  reason: string
}

interface HeatmapRecord extends Record_ {
  lang: string
  model: string
  phrases: HeatPhrase[]
  summary: string
}

function systemPrompt(langName: string): string {
  return [
    'You are a diffusion-model interpretability analyst.',
    'You are given the complete text of a prompt that was handed to an image model.',
    'The prompt contains no physical description of any person, yet the model repeatedly produced the same face:',
    'ageless, androgynous, pale, with high cheekbones and a shaved or severe hairline.',
    '',
    `Return ONLY a JSON object with this exact shape (all prose written in ${langName}):`,
    '{',
    '  "phrases": [ { "phrase": "<EXACT substring copied character-for-character from the prompt, in the original English>",',
    `                 "weight": <number between 0 and 1>,`,
    `                 "reason": "<at most 20 words, in ${langName}>" } ],`,
    `  "summary": "<at most 60 words, in ${langName}>"`,
    '}',
    '',
    `Give between ${MIN_PHRASES} and ${MAX_PHRASES} phrases.`,
    'Each "phrase" MUST be copied verbatim from the prompt — same characters, same casing, no paraphrase, no ellipsis, no added quotation marks.',
    'Prefer phrases of two to eight words.',
    'The weight expresses how strongly that phrase would pull the model toward that particular face — not how poetic it is.',
    'Do not name any real person anywhere in your answer.',
  ].join('\n')
}

/** Keep only phrases that really occur in the prompt; snap near-misses onto the original casing. */
function validatePhrases(raw: unknown): HeatPhrase[] {
  if (!Array.isArray(raw)) return []
  const haystack = PAUL_PROMPT
  const lower = haystack.toLowerCase()
  const seen = new Set<string>()
  const out: HeatPhrase[] = []

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const candidate = (item as { phrase?: unknown }).phrase
    if (typeof candidate !== 'string') continue
    const trimmed = candidate.trim().replace(/^["'“”„]+|["'“”„.,;:]+$/g, '')
    if (trimmed.length < 3 || trimmed.length > 160) continue

    let at = haystack.indexOf(trimmed)
    let phrase = trimmed
    if (at < 0) {
      at = lower.indexOf(trimmed.toLowerCase())
      if (at < 0) continue // the model invented it — drop it
      phrase = haystack.slice(at, at + trimmed.length)
    }

    const key = phrase.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const rawWeight = Number((item as { weight?: unknown }).weight)
    const weight = Number.isFinite(rawWeight) ? Math.max(0, Math.min(1, rawWeight)) : 0.5
    const reason = typeof (item as { reason?: unknown }).reason === 'string' ? (item as { reason: string }).reason.trim().slice(0, MAX_REASON_CHARS) : ''

    out.push({ phrase, weight, reason })
    if (out.length >= MAX_PHRASES) break
  }
  return out
}

export async function POST(request: NextRequest) {
  const blocked = gate(request)
  if (blocked) return blocked

  const payload = (await request.json().catch(() => ({}))) as { lang?: unknown }
  const lang = typeof payload.lang === 'string' && LOCALE_CODES.includes(payload.lang) ? payload.lang : 'en'

  // Cached answers are free and do not spend the visitor's daily budget.
  try {
    const rows = await readRecords<HeatmapRecord>(COLLECTION)
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i]
      if (row.lang === lang && Array.isArray(row.phrases) && row.phrases.length) {
        return NextResponse.json({ phrases: row.phrases, summary: row.summary ?? '', lang, model: row.model, cached: true, ts: row.ts })
      }
    }
  } catch (e) {
    console.error('heatmap cache read failed:', e)
  }

  const ip = getClientIP(request)
  const limit = checkRateLimit(ip, { ...RATE_LIMIT, identifier: `archaeology_heatmap_${ip}` })
  if (!limit.success) {
    return NextResponse.json(
      { error: 'The excavation log is full for today. Come back tomorrow.', retryAfter: limit.retryAfter },
      { status: 429, headers: getRateLimitHeaders(limit, RATE_LIMIT.maxRequests) }
    )
  }

  try {
    const langName = getLocale(lang).llm
    const text = await complete(
      [
        { role: 'system', content: systemPrompt(langName) },
        { role: 'user', content: `PROMPT (English original, do not translate the "phrase" values):\n\n${PAUL_PROMPT}` },
      ],
      { json: true, temperature: 0.5, maxTokens: 1600 }
    )

    let parsed: { phrases?: unknown; summary?: unknown }
    try {
      parsed = JSON.parse(text)
    } catch {
      const match = /\{[\s\S]*\}/.exec(text)
      if (!match) throw new LlmError(502, 'model returned no JSON')
      parsed = JSON.parse(match[0])
    }

    const phrases = validatePhrases(parsed.phrases)
    if (!phrases.length) throw new LlmError(502, 'no phrase survived validation')
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim().slice(0, MAX_SUMMARY_CHARS) : ''

    await appendRecord(COLLECTION, { lang, model: CHAT_MODEL, phrases, summary })

    return NextResponse.json(
      { phrases, summary, lang, model: CHAT_MODEL, cached: false },
      { headers: getRateLimitHeaders(limit, RATE_LIMIT.maxRequests) }
    )
  } catch (error) {
    console.error('Archaeology heatmap error:', error)
    // Always answer with a 5xx: a missing OPENROUTER_API_KEY is our problem, not the visitor's.
    const status = error instanceof LlmError ? 502 : 500
    return NextResponse.json({ error: 'The excavation stalled. The strata would not read.' }, { status })
  }
}

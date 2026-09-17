// Server-side data helpers for the "community" package.
// NEVER import this from a client component — it reaches into app/lib/store.ts (fs).

import { createHash } from 'crypto'
import { appendRecord, readRecords, rewriteRecords, type Record_ } from '@/app/lib/store'
import { FEED_LIMIT, RECENT_SIGNATURES } from './limits'

export const TESTIMONY_COLLECTION = 'testimonies'
export const COSIGN_COLLECTION = 'cosigns'

export {
  TESTIMONY_MAX,
  TESTIMONY_NAME_MAX,
  COSIGN_NAME_MAX,
  COSIGN_CITY_MAX,
  FEED_LIMIT,
  RECENT_SIGNATURES,
} from './limits'

/** How many slur-list hits a sentence may contain before it is rejected outright. */
export const MAX_SLUR_HITS = 0

export type TestimonyStatus = 'approved' | 'pending' | 'hidden'

export interface TestimonyRecord extends Record_ {
  text: string
  name: string
  lang: string
  status: TestimonyStatus
  ipHash: string
}

export interface CosignRecord extends Record_ {
  name: string
  city: string
  ipHash: string
}

/* ------------------------------------------------------------------ privacy */

const SALT_FALLBACK = 'latent-liturgy-testimony-salt-v1'

/** sha256(ip + salt). Raw IPs are never persisted. */
export function hashIp(ip: string): string {
  const salt = process.env.SESSION_SECRET || SALT_FALLBACK
  return createHash('sha256').update(`${ip}|${salt}`).digest('hex').slice(0, 32)
}

/* --------------------------------------------------------------- moderation */

/** `post` (default): new testimonies appear immediately. Anything else: they queue as `pending`. */
export function moderationMode(): 'post' | 'pre' {
  const raw = (process.env.TESTIMONY_MODERATION || '').trim().toLowerCase()
  return !raw || raw === 'post' ? 'post' : 'pre'
}

export function initialStatus(): TestimonyStatus {
  return moderationMode() === 'post' ? 'approved' : 'pending'
}

const URL_RE = /(https?:\/\/|www\.)/i
const BARE_DOMAIN_RE = /\b[a-z0-9-]{2,}\.(com|net|org|io|co|ru|xyz|info|biz|shop|top|link|site|app|dev|me|tv|pl|de|uk|fr|es|it)\b/i
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i

// A deliberately small, blunt list. Post-moderation (DELETE with x-mod-token) is the real filter.
const SLURS = [
  'nigger', 'nigga', 'faggot', 'kike', 'spic', 'chink', 'gook', 'tranny',
  'retard', 'wetback', 'coon', 'dyke', 'paki', 'cunt',
  'kurwa', 'skurwysyn', 'pierdol', 'cwel', 'pedal',
]

export type RejectReason = 'url' | 'email' | 'slur'

function words(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
}

/** Returns a rejection reason, or null when the sentence may be stored. */
export function rejectReason(text: string): RejectReason | null {
  if (URL_RE.test(text) || BARE_DOMAIN_RE.test(text)) return 'url'
  if (EMAIL_RE.test(text)) return 'email'
  const hits = words(text).filter(w => SLURS.some(s => w === s || w.startsWith(s))).length
  if (hits > MAX_SLUR_HITS) return 'slur'
  return null
}

/* ------------------------------------------------------------- testimonies */

export async function allTestimonies(): Promise<TestimonyRecord[]> {
  return readRecords<TestimonyRecord>(TESTIMONY_COLLECTION)
}

/** Newest first, approved only. */
export async function approvedTestimonies(limit = FEED_LIMIT): Promise<TestimonyRecord[]> {
  const rows = await allTestimonies()
  return rows
    .filter(r => r.status === 'approved')
    .sort((a, b) => b.ts - a.ts)
    .slice(0, limit)
}

export async function getTestimony(id: string): Promise<TestimonyRecord | null> {
  if (!id || !/^[a-z0-9]{1,40}$/i.test(id)) return null
  const rows = await allTestimonies()
  return rows.find(r => r.id === id && r.status === 'approved') ?? null
}

interface TestimonyInput {
  text: string
  name: string
  lang: string
  status: TestimonyStatus
  ipHash: string
}

export async function addTestimony(data: { text: string; name: string; lang: string; ipHash: string }): Promise<TestimonyRecord> {
  const input: TestimonyInput = {
    text: data.text,
    name: data.name,
    lang: data.lang,
    status: initialStatus(),
    ipHash: data.ipHash,
  }
  return appendRecord<TestimonyInput>(TESTIMONY_COLLECTION, input)
}

/** True when this ipHash already posted the exact same sentence. */
export async function isDuplicateTestimony(ipHash: string, text: string): Promise<boolean> {
  const rows = await allTestimonies()
  const needle = text.trim().toLowerCase()
  return rows.some(r => r.ipHash === ipHash && r.text.trim().toLowerCase() === needle)
}

/** Moderation: flip one record to `hidden`. Returns true when something changed. */
export async function hideTestimony(id: string): Promise<boolean> {
  let changed = false
  await rewriteRecords<TestimonyRecord>(TESTIMONY_COLLECTION, rows =>
    rows.map(r => {
      if (r.id !== id || r.status === 'hidden') return r
      changed = true
      return { ...r, status: 'hidden' as TestimonyStatus }
    })
  )
  return changed
}

/* ---------------------------------------------------------------- cosigns */

/** "Anna Kowalska" -> "Anna K." — we store the full name, we never show it. */
export function displayName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return ''
  const first = parts[0]
  if (parts.length === 1) return first
  const initial = Array.from(parts[parts.length - 1])[0]
  return `${first} ${initial.toUpperCase()}.`
}

export async function allCosigns(): Promise<CosignRecord[]> {
  return readRecords<CosignRecord>(COSIGN_COLLECTION)
}

export async function hasSigned(ipHash: string): Promise<boolean> {
  const rows = await allCosigns()
  return rows.some(r => r.ipHash === ipHash)
}

interface CosignInput {
  name: string
  city: string
  ipHash: string
}

export async function addCosign(data: CosignInput): Promise<CosignRecord> {
  return appendRecord<CosignInput>(COSIGN_COLLECTION, data)
}

export interface CosignSummary {
  count: number
  recent: { display: string; city: string }[]
}

export async function cosignSummary(): Promise<CosignSummary> {
  const rows = await allCosigns()
  const recent = [...rows]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, RECENT_SIGNATURES)
    .map(r => ({ display: displayName(r.name), city: r.city }))
    .filter(r => !!r.display)
  return { count: rows.length, recent }
}

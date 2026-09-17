#!/usr/bin/env node
/**
 * Machine-translate the UI dictionaries into every locale from app/lib/i18n/config.ts
 * using OpenRouter (default model: google/gemini-flash-latest).
 *
 *   node scripts/translate.mjs                 # translate missing keys for all locales
 *   node scripts/translate.mjs --lang de,fr    # only some locales
 *   node scripts/translate.mjs --force         # retranslate everything
 *   node scripts/translate.mjs --scope core    # only app/locales (skip feature packages)
 *
 * Sources: app/locales/en.json (hand-written, canonical) and app/features/<pkg>/i18n/en.json.
 * Polish (pl) is hand-written too and never overwritten unless --force-pl.
 * Reads OPENROUTER_API_KEY from the environment or .env.local.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const flag = name => args.includes(name)
const opt = name => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}

await loadDotEnv()
const API_KEY = process.env.OPENROUTER_API_KEY
if (!API_KEY) {
  console.error('OPENROUTER_API_KEY missing (set it in .env.local)')
  process.exit(1)
}
const MODEL = process.env.OPENROUTER_TRANSLATE_MODEL || process.env.OPENROUTER_MODEL || 'google/gemini-flash-latest'

// Parse the locale registry without importing TS: pull `{ code: 'xx', ... llm: '...' }` pairs.
const configSrc = await fs.readFile(path.join(ROOT, 'app/lib/i18n/config.ts'), 'utf8')
const LOCALES = [...configSrc.matchAll(/code:\s*'([a-z]{2})'[^}]*?english:\s*'([^']+)'[^}]*?llm:\s*'([^']+)'/g)].map(m => ({ code: m[1], english: m[2], llm: m[3] }))
if (!LOCALES.length) throw new Error('could not parse LOCALES from config.ts')

const only = opt('--lang')?.split(',').map(s => s.trim())
const targets = LOCALES.filter(l => l.code !== 'en' && (!only || only.includes(l.code)) && (l.code !== 'pl' || flag('--force-pl')))

const scope = opt('--scope') || 'all'
const sources = [{ dir: path.join(ROOT, 'app/locales'), name: 'core' }]
if (scope !== 'core') {
  const featuresDir = path.join(ROOT, 'app/features')
  for (const entry of await fs.readdir(featuresDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const dir = path.join(featuresDir, entry.name, 'i18n')
    try {
      await fs.access(path.join(dir, 'en.json'))
      sources.push({ dir, name: entry.name })
    } catch {
      /* no i18n */
    }
  }
}

const GLOSSARY = `
Glossary / rules:
- Keep untranslated: "The Latent Liturgy", "Genesis", "Incarnation", "Exegesis" (panel names used as proper nouns), "Tilda Swinton", "Google", "Gemini", "Nano Banana Pro", "OpenRouter", "P.Lazniak", "Paul Lazniak" (in Polish: "Paweł Łaźniak"), file names (asset_Woman_The_Medium.png, stage3_narrative.json …), JSON keys, "buymeacoffee".
- "the Curator" / "Latent Space Curator" → translate naturally as a title.
- Preserve EXACTLY: placeholders like {count} {model} {n}, the tags <p>…</p> <f>…</f> <s>…</s> <b>…</b> <m>…</m> <i>…</i> and <br/> (translate only the text inside them), leading "// ", "⚡", "⚠", "→", "←", "◉", "🔄", "💡" and other symbols, and line breaks (\\n).
- Labels written in UPPERCASE stay uppercase (in scripts that have case). Keep them short: they sit in small buttons.
- Register: forensic, ritual, calm, literary. The narration texts under "voice" are spoken in first person by the artist (male, Paweł Łaźniak) — natural spoken language, short sentences, no tags, keep his name as "Paweł Łaźniak".
- The "prompt" text is a translation of a metaphysical prompt: keep the strangeness, translate faithfully, do not summarize.
- Output must be valid JSON with exactly the same keys and structure as the input. Arrays stay arrays of the same length.
`

async function translateObject(obj, target, sourceName) {
  const messages = [
    {
      role: 'system',
      content: `You are a professional literary and UI translator. Translate the JSON values from English into ${target.llm}. ${GLOSSARY}`,
    },
    { role: 'user', content: `Namespace: ${sourceName}. Translate every string value. Return only the JSON.\n\n${JSON.stringify(obj, null, 2)}` },
  ]
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://eon.pablogfx.com', 'X-Title': 'Latent Liturgy i18n' },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.2, max_tokens: 16000, response_format: { type: 'json_object' } }),
    })
    if (!res.ok) {
      console.warn(`  ${target.code}: HTTP ${res.status} (attempt ${attempt})`, (await res.text()).slice(0, 200))
      await sleep(2000 * attempt)
      continue
    }
    const data = await res.json()
    let text = data?.choices?.[0]?.message?.content ?? ''
    text = text.trim().replace(/^```json\s*/i, '').replace(/```$/, '')
    try {
      const parsed = JSON.parse(text)
      if (sameShape(obj, parsed)) return parsed
      console.warn(`  ${target.code}: shape mismatch (attempt ${attempt})`)
    } catch (e) {
      console.warn(`  ${target.code}: bad JSON (attempt ${attempt})`)
    }
  }
  throw new Error(`translation failed for ${target.code}`)
}

function sameShape(a, b) {
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length
  if (a && typeof a === 'object') {
    if (!b || typeof b !== 'object' || Array.isArray(b)) return false
    return Object.keys(a).every(k => k in b && sameShape(a[k], b[k]))
  }
  return typeof b === 'string'
}

/** Return the subset of `src` whose keys are missing (or empty) in `existing`. */
function missingSubset(src, existing) {
  if (Array.isArray(src)) return Array.isArray(existing) && existing.length === src.length ? undefined : src
  if (src && typeof src === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(src)) {
      const sub = missingSubset(v, existing?.[k])
      if (sub !== undefined) out[k] = sub
    }
    return Object.keys(out).length ? out : undefined
  }
  return typeof existing === 'string' && existing.length ? undefined : src
}

function deepMerge(base, patch) {
  if (Array.isArray(patch) || typeof patch !== 'object' || patch === null) return patch
  const out = { ...(base && typeof base === 'object' && !Array.isArray(base) ? base : {}) }
  for (const [k, v] of Object.entries(patch)) out[k] = deepMerge(out[k], v)
  return out
}

/** Reorder keys to match the source (keeps diffs readable). */
function reorder(src, obj) {
  if (Array.isArray(src) || typeof src !== 'object' || src === null) return obj
  const out = {}
  for (const k of Object.keys(src)) if (k in obj) out[k] = reorder(src[k], obj[k])
  return out
}

/** Split a big dictionary into chunks of roughly `limit` characters, by top-level key. */
function chunk(obj, limit = 9000) {
  const chunks = []
  let cur = {}
  let size = 0
  for (const [k, v] of Object.entries(obj)) {
    const s = JSON.stringify(v).length
    if (size + s > limit && Object.keys(cur).length) {
      chunks.push(cur)
      cur = {}
      size = 0
    }
    cur[k] = v
    size += s
  }
  if (Object.keys(cur).length) chunks.push(cur)
  return chunks
}

let totalChars = 0
for (const source of sources) {
  const en = JSON.parse(await fs.readFile(path.join(source.dir, 'en.json'), 'utf8'))
  if (!Object.keys(en).length) continue
  console.log(`\n== ${source.name} (${source.dir})`)
  for (const target of targets) {
    const file = path.join(source.dir, `${target.code}.json`)
    let existing = {}
    try {
      existing = JSON.parse(await fs.readFile(file, 'utf8'))
    } catch {
      /* new */
    }
    const todo = flag('--force') ? en : missingSubset(en, existing)
    if (!todo) {
      console.log(`  ${target.code}: up to date`)
      continue
    }
    const parts = chunk(todo)
    console.log(`  ${target.code}: translating ${JSON.stringify(todo).length} chars in ${parts.length} request(s)…`)
    let merged = existing
    for (const part of parts) {
      const translated = await translateObject(part, target, source.name)
      merged = deepMerge(merged, translated)
      totalChars += JSON.stringify(part).length
    }
    await fs.writeFile(file, JSON.stringify(reorder(en, merged), null, 2) + '\n', 'utf8')
    console.log(`  ${target.code}: written`)
  }
}
console.log(`\nDone. ~${totalChars} source characters sent to ${MODEL}.`)

async function loadDotEnv() {
  for (const name of ['.env.local', '.env']) {
    try {
      const raw = await fs.readFile(path.join(ROOT, name), 'utf8')
      for (const line of raw.split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
      }
    } catch {
      /* none */
    }
  }
}
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

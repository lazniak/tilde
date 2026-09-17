#!/usr/bin/env node
/**
 * Generate the narrator tracks (the artist's cloned voice) with ElevenLabs v3.
 *
 *   node scripts/voiceover.mjs                      # nav segments for every locale that has a dictionary
 *   node scripts/voiceover.mjs --lang pl,en         # only some locales
 *   node scripts/voiceover.mjs --segments entry,hub # only some segments
 *   node scripts/voiceover.mjs --statement          # also the long artist's statement (VOICEOVER_*.txt)
 *   node scripts/voiceover.mjs --force              # regenerate existing files
 *   node scripts/voiceover.mjs --dry                # print the texts, call nothing
 *
 * Output: public/voice/<lang>/<segment>.mp3 (+ <segment>.json with character alignment for karaoke subtitles).
 * Text source: app/locales/<lang>.json → "voice" → segments. Every request ends with the tag "[pause]." as agreed
 * with the artist (tags always at the end of a narration).
 *
 * Env: ELEVENLABS_API_KEY (environment or .env.local). Voice: ELEVEN_VOICE_ID (default q2Jflwxxc8OoEk4kjqyg).
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const flag = n => args.includes(n)
const opt = n => {
  const i = args.indexOf(n)
  return i >= 0 ? args[i + 1] : undefined
}

await loadDotEnv()
const API_KEY = process.env.ELEVENLABS_API_KEY
const VOICE_ID = process.env.ELEVEN_VOICE_ID || 'q2Jflwxxc8OoEk4kjqyg'
const MODEL_ID = process.env.ELEVEN_MODEL_ID || 'eleven_v3'
const SEGMENTS = ['entry', 'hub', 'genesis', 'incarnation', 'exegesis', 'epilogue']
const TRAILER = ' [pause].'
const MAX_CHARS = 4800

if (!API_KEY && !flag('--dry')) {
  console.error('ELEVENLABS_API_KEY missing')
  process.exit(1)
}

const onlyLangs = opt('--lang')?.split(',').map(s => s.trim())
const onlySegs = opt('--segments')?.split(',').map(s => s.trim())

const localeFiles = (await fs.readdir(path.join(ROOT, 'app/locales'))).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''))
const langs = localeFiles.filter(l => !onlyLangs || onlyLangs.includes(l))

// Voice settings: v3 accepts stability 0 / 0.5 / 1 (creative / natural / robust).
const VOICE_SETTINGS = { stability: 0.5, similarity_boost: 0.75, use_speaker_boost: true, speed: 1.0 }

let generated = 0
let chars = 0
for (const lang of langs) {
  const dict = JSON.parse(await fs.readFile(path.join(ROOT, 'app/locales', `${lang}.json`), 'utf8'))
  const voice = dict.voice || {}
  const outDir = path.join(ROOT, 'public/voice', lang)
  await fs.mkdir(outDir, { recursive: true })

  const jobs = SEGMENTS.filter(s => !onlySegs || onlySegs.includes(s)).map(s => ({ segment: s, text: voice[s] }))
  if (flag('--statement')) {
    const stmt = await readStatement(lang)
    if (stmt) jobs.push({ segment: 'statement', text: stmt })
  }

  for (const job of jobs) {
    if (!job.text || typeof job.text !== 'string') {
      console.log(`  ${lang}/${job.segment}: no text (skip)`)
      continue
    }
    const mp3 = path.join(outDir, `${job.segment}.mp3`)
    if (!flag('--force') && (await exists(mp3))) {
      console.log(`  ${lang}/${job.segment}: exists`)
      continue
    }
    const text = normalise(job.text) + TRAILER
    chars += text.length
    if (flag('--dry')) {
      console.log(`\n[${lang}/${job.segment}] (${text.length} chars)\n${text}`)
      continue
    }
    process.stdout.write(`  ${lang}/${job.segment}: generating (${text.length} chars)… `)
    try {
      if (text.length > MAX_CHARS) {
        // ElevenLabs caps a request at 5000 chars: split at paragraph boundaries, each part ends with the tag, then concatenate.
        const parts = splitText(normalise(job.text), MAX_CHARS - TRAILER.length).map(p => p + TRAILER)
        const tmpFiles = []
        for (let i = 0; i < parts.length; i++) {
          const { audio } = await tts(parts[i])
          const tmp = path.join(outDir, `${job.segment}.part${i}.mp3`)
          await fs.writeFile(tmp, audio)
          tmpFiles.push(tmp)
          process.stdout.write(`${i + 1}/${parts.length} `)
          await sleep(400)
        }
        await concatMp3(tmpFiles, mp3)
        for (const f of tmpFiles) await fs.unlink(f).catch(() => undefined)
        generated++
        console.log('ok (concatenated)')
      } else {
        const { audio, alignment } = await tts(text)
        await fs.writeFile(mp3, audio)
        if (alignment) await fs.writeFile(path.join(outDir, `${job.segment}.json`), JSON.stringify(alignment), 'utf8')
        generated++
        console.log(`ok${alignment ? ' +alignment' : ''}`)
      }
    } catch (e) {
      console.log(`FAILED: ${e.message}`)
    }
    await sleep(400)
  }
}
console.log(`\nDone: ${generated} files, ${chars} characters${flag('--dry') ? ' (dry run)' : ''}.`)

/** Prefer the with-timestamps endpoint (karaoke); fall back to the plain one. */
async function tts(text) {
  const base = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`
  const body = JSON.stringify({ text, model_id: MODEL_ID, voice_settings: VOICE_SETTINGS })
  const headers = { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' }

  let res = await fetch(`${base}/with-timestamps?output_format=mp3_44100_128`, { method: 'POST', headers, body })
  if (res.ok) {
    const data = await res.json()
    const al = data.normalized_alignment || data.alignment
    return {
      audio: Buffer.from(data.audio_base64, 'base64'),
      alignment: al ? { characters: al.characters, character_start_times_seconds: al.character_start_times_seconds, character_end_times_seconds: al.character_end_times_seconds } : null,
    }
  }
  const firstErr = await res.text().catch(() => '')
  res = await fetch(`${base}?output_format=mp3_44100_128`, { method: 'POST', headers: { ...headers, Accept: 'audio/mpeg' }, body })
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)} (timestamps: ${firstErr.slice(0, 120)})`)
  return { audio: Buffer.from(await res.arrayBuffer()), alignment: null }
}

function normalise(t) {
  return t
    .replace(/[ \t]+/g, ' ')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+\[pause\]\.?$/i, '')
    .trim()
}

/** Split long text at paragraph (then sentence) boundaries into chunks ≤ limit chars. */
function splitText(text, limit) {
  const paras = text.split(/\n\s*\n/)
  const chunks = []
  let cur = ''
  const push = () => {
    if (cur.trim()) chunks.push(cur.trim())
    cur = ''
  }
  for (const p of paras) {
    if (p.length > limit) {
      push()
      for (const sentence of p.match(/[^.!?]+[.!?]+["»”]?\s*|[^.!?]+$/g) || [p]) {
        if ((cur + sentence).length > limit) push()
        cur += sentence
      }
      push()
    } else if ((cur + '\n\n' + p).length > limit) {
      push()
      cur = p
    } else {
      cur = cur ? cur + '\n\n' + p : p
    }
  }
  push()
  return chunks
}

async function concatMp3(files, out) {
  const { execFile } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const list = out + '.txt'
  const lines = files.map(f => `file '${path.resolve(f).replace(/\\/g, '/').replace(/'/g, "'\\''")}'`)
  await fs.writeFile(list, lines.join('\n'), 'utf8')
  try {
    await promisify(execFile)('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out])
  } finally {
    await fs.unlink(list).catch(() => undefined)
  }
}

async function readStatement(lang) {
  const candidates = [path.join(ROOT, `VOICEOVER_${lang.toUpperCase()}.txt`), path.join(ROOT, 'voiceover', `${lang}.txt`)]
  for (const f of candidates) {
    if (await exists(f)) {
      const raw = await fs.readFile(f, 'utf8')
      // Strip the script scaffolding: headers, separators, [notes], and the trailing technical notes block.
      const cut = raw.split(/NOTATKI TECHNICZNE|TECHNICAL NOTES/i)[0]
      return cut
        .split('\n')
        .filter(l => !/^=+$/.test(l.trim()) && !/^\[.*\]$/.test(l.trim()) && !/^(LATENT LITURGY|Skrypt narracyjny|Narrator:|Czas trwania|Narration script|Duration)/i.test(l.trim()))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    }
  }
  return null
}

async function exists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}
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

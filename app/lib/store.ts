// Tiny append-only JSON-lines store for community features (testimonies, counters, co-signatures).
// Single-process, single-VPS design: writes are serialized through an in-memory queue.
// Data lives in ./data/<collection>.jsonl (git-ignored). Good enough for an art project;
// swap for SQLite if traffic ever justifies it.

import { promises as fs } from 'fs'
import path from 'path'

const DATA_DIR = process.env.LITURGY_DATA_DIR || path.join(process.cwd(), 'data')

let queue: Promise<unknown> = Promise.resolve()

function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn)
  queue = run.catch(() => undefined)
  return run
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

function fileFor(collection: string) {
  if (!/^[a-z0-9_-]+$/i.test(collection)) throw new Error('bad collection name')
  return path.join(DATA_DIR, `${collection}.jsonl`)
}

export interface Record_ {
  id: string
  ts: number
  [key: string]: unknown
}

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

/** Append one record; returns it with id/ts filled in. */
export async function appendRecord<T extends object>(collection: string, data: T): Promise<T & Record_> {
  return serialize(async () => {
    await ensureDir()
    const rec = { id: newId(), ts: Date.now(), ...data } as T & Record_
    await fs.appendFile(fileFor(collection), JSON.stringify(rec) + '\n', 'utf8')
    return rec
  })
}

/** Read all records (newest last). Cheap for thousands of lines; paginate above that. */
export async function readRecords<T extends Record_ = Record_>(collection: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(fileFor(collection), 'utf8')
    return raw
      .split('\n')
      .filter(Boolean)
      .map(line => {
        try {
          return JSON.parse(line) as T
        } catch {
          return null
        }
      })
      .filter((r): r is T => !!r)
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw e
  }
}

/** Rewrite a collection with a mapped/filtered list (used for moderation). */
export async function rewriteRecords<T extends Record_>(collection: string, mapper: (rows: T[]) => T[]): Promise<T[]> {
  return serialize(async () => {
    await ensureDir()
    const rows = await readRecords<T>(collection)
    const next = mapper(rows)
    const tmp = fileFor(collection) + '.tmp'
    await fs.writeFile(tmp, next.map(r => JSON.stringify(r)).join('\n') + (next.length ? '\n' : ''), 'utf8')
    await fs.rename(tmp, fileFor(collection))
    return next
  })
}

/** Simple named counters stored as a JSON object in counters.json. */
export async function bumpCounter(name: string, by = 1): Promise<number> {
  return serialize(async () => {
    await ensureDir()
    const file = path.join(DATA_DIR, 'counters.json')
    let counters: Record<string, number> = {}
    try {
      counters = JSON.parse(await fs.readFile(file, 'utf8'))
    } catch {
      /* first write */
    }
    counters[name] = (counters[name] ?? 0) + by
    await fs.writeFile(file, JSON.stringify(counters), 'utf8')
    return counters[name]
  })
}

export async function readCounters(): Promise<Record<string, number>> {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, 'counters.json'), 'utf8'))
  } catch {
    return {}
  }
}

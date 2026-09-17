'use client'

// Browser-side client for the Curator chat (streaming) and other token-gated endpoints.

export interface ChatMessage {
  role: 'user' | 'model'
  content: string
}

const TOKEN_HEADER = 'x-liturgy-token'
let token: string | null = null
let tokenPromise: Promise<string> | null = null

async function fetchToken(): Promise<string> {
  const res = await fetch('/api/session', { cache: 'no-store' })
  if (!res.ok) throw new Error('session')
  const data = await res.json()
  token = data.token
  return data.token
}

export async function getSessionToken(force = false): Promise<string> {
  if (token && !force) return token
  if (!tokenPromise || force) {
    tokenPromise = fetchToken().finally(() => {
      tokenPromise = null
    })
  }
  return tokenPromise
}

/** fetch() wrapper that attaches the session token and retries once on 401. */
export async function gatedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const attempt = async (tk: string) =>
    fetch(input, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}), [TOKEN_HEADER]: tk } })
  let res = await attempt(await getSessionToken())
  if (res.status === 401) res = await attempt(await getSessionToken(true))
  return res
}

export class CuratorError extends Error {
  status: number
  retryAfter?: number
  constructor(status: number, message: string, retryAfter?: number) {
    super(message)
    this.status = status
    this.retryAfter = retryAfter
  }
}

/**
 * Stream a Curator reply. `onDelta` receives text chunks as they arrive.
 * Resolves with the full text.
 */
export async function streamCurator(
  message: string,
  history: ChatMessage[],
  lang: string,
  onDelta: (chunk: string, full: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const res = await gatedFetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history, lang }),
    signal,
  })

  if (!res.ok || !res.body) {
    let msg = 'The neural pathways faltered.'
    let retryAfter: number | undefined
    try {
      const data = await res.json()
      msg = data.error || msg
      retryAfter = data.retryAfter
    } catch {
      /* ignore */
    }
    throw new CuratorError(res.status, msg, retryAfter)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    if (chunk) {
      full += chunk
      onDelta(chunk, full)
    }
  }
  return full
}

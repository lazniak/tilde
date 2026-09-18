// OpenRouter client (server-side only). One key, one provider, any model.
// Default model is Google's rolling "latest Flash" alias so the Curator keeps
// answering with the same model family that produced the images.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export const CHAT_MODEL = process.env.OPENROUTER_MODEL || '~google/gemini-flash-latest'
export const VISION_MODEL = process.env.OPENROUTER_VISION_MODEL || CHAT_MODEL

export type LlmRole = 'system' | 'user' | 'assistant'

export type LlmContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export interface LlmMessage {
  role: LlmRole
  content: string | LlmContentPart[]
}

export interface LlmOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  /** Ask OpenRouter for a JSON object response */
  json?: boolean
  /**
   * Thinking budget. OpenRouter counts reasoning tokens against max_tokens, and
   * Gemini Flash happily burns the whole budget on thinking before writing a
   * single visible character, so every call defaults to a low effort.
   */
  reasoning?: 'none' | 'minimal' | 'low' | 'medium' | 'high'
}

export class LlmError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function headers(): Record<string, string> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new LlmError(500, 'OPENROUTER_API_KEY not configured')
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.SITE_URL || 'https://eon.pablogfx.com',
    'X-Title': 'The Latent Liturgy',
  }
}

function body(messages: LlmMessage[], opts: LlmOptions, stream: boolean) {
  return JSON.stringify({
    model: opts.model || CHAT_MODEL,
    messages,
    stream,
    temperature: opts.temperature ?? 0.9,
    top_p: opts.topP ?? 0.95,
    max_tokens: opts.maxTokens ?? 1024,
    reasoning: { effort: opts.reasoning ?? 'low', exclude: true },
    ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
  })
}

/** Non-streaming completion. Returns the assistant text. */
export async function complete(messages: LlmMessage[], opts: LlmOptions = {}): Promise<string> {
  const res = await fetch(OPENROUTER_URL, { method: 'POST', headers: headers(), body: body(messages, opts, false) })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new LlmError(res.status, `OpenRouter ${res.status}: ${text.slice(0, 300)}`)
  }
  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.map((p: { text?: string }) => p.text ?? '').join('')
  return ''
}

/**
 * Streaming completion. Resolves to a ReadableStream of UTF-8 text deltas
 * (already unwrapped from OpenRouter's SSE framing), ready to return from a Route Handler.
 */
export async function streamCompletion(messages: LlmMessage[], opts: LlmOptions = {}): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(OPENROUTER_URL, { method: 'POST', headers: headers(), body: body(messages, opts, true) })
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    throw new LlmError(res.status, `OpenRouter ${res.status}: ${text.slice(0, 300)}`)
  }

  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''

  return res.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const raw of lines) {
          const line = raw.trim()
          if (!line.startsWith('data:')) continue // comments / keep-alives
          const payload = line.slice(5).trim()
          if (payload === '[DONE]') continue
          try {
            const json = JSON.parse(payload)
            const delta = json?.choices?.[0]?.delta?.content
            if (typeof delta === 'string' && delta) controller.enqueue(encoder.encode(delta))
            const err = json?.error?.message
            if (err) controller.enqueue(encoder.encode(`\n[${err}]`))
          } catch {
            /* partial JSON — wait for more */
          }
        }
      },
    })
  )
}

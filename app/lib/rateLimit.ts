/**
 * Simple in-memory rate limiter for API protection.
 * Two buckets per identifier: a short window (burst) and a daily cap (cost ceiling).
 * Single-process design — fine behind one nginx on one VPS.
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up old entries every 5 minutes
if (typeof setInterval === 'function') {
  const timer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) rateLimitStore.delete(key)
    }
  }, 5 * 60 * 1000)
  // Do not keep the process alive just for cleanup
  ;(timer as unknown as { unref?: () => void }).unref?.()
}

export interface RateLimitConfig {
  maxRequests: number // Maximum requests allowed in the window
  windowMs: number // Time window in milliseconds
  identifier?: string // Optional custom identifier (defaults to IP)
  dailyMax?: number // Optional hard cap per rolling 24h
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetTime: number
  retryAfter?: number // Seconds until reset (only if rate limited)
  reason?: 'burst' | 'daily'
}

function bump(key: string, max: number, windowMs: number, now: number) {
  let entry = rateLimitStore.get(key)
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + windowMs }
  }
  entry.count++
  rateLimitStore.set(key, entry)
  return { entry, ok: entry.count <= max, remaining: Math.max(0, max - entry.count) }
}

/**
 * Check and update rate limit for a given identifier
 */
export function checkRateLimit(
  ip: string,
  config: RateLimitConfig = { maxRequests: 5, windowMs: 60 * 1000 }
): RateLimitResult {
  const { maxRequests, windowMs, identifier, dailyMax } = config
  const key = identifier || ip
  const now = Date.now()

  const burst = bump(key, maxRequests, windowMs, now)
  if (!burst.ok) {
    return {
      success: false,
      remaining: 0,
      resetTime: burst.entry.resetTime,
      retryAfter: Math.ceil((burst.entry.resetTime - now) / 1000),
      reason: 'burst',
    }
  }

  if (dailyMax) {
    const day = bump(`${key}:day`, dailyMax, 24 * 60 * 60 * 1000, now)
    if (!day.ok) {
      return {
        success: false,
        remaining: 0,
        resetTime: day.entry.resetTime,
        retryAfter: Math.ceil((day.entry.resetTime - now) / 1000),
        reason: 'daily',
      }
    }
  }

  return { success: true, remaining: burst.remaining, resetTime: burst.entry.resetTime }
}

/**
 * Get client IP from request headers.
 * nginx MUST overwrite (not append) X-Forwarded-For / X-Real-IP, see DEPLOY.md —
 * otherwise a client can spoof its way past the limiter.
 */
export function getClientIP(request: Request): string {
  const realIP = request.headers.get('x-real-ip')
  if (realIP) return realIP.trim()

  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()

  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  if (cfConnectingIP) return cfConnectingIP

  return 'unknown'
}

/**
 * Create rate limit response headers
 */
export function getRateLimitHeaders(result: RateLimitResult, maxRequests: number): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  }
  if (result.retryAfter) headers['Retry-After'] = result.retryAfter.toString()
  return headers
}

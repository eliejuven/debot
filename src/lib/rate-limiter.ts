// In-memory rate limiter using a sliding window approach
// For production, use Redis

interface RateLimitEntry {
  count: number
  windowStart: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of Array.from(store.entries())) {
    if (now - entry.windowStart > 60_000) {
      store.delete(key)
    }
  }
}, 5 * 60_000)

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: Date
  retryAfter?: number
}

export function checkRateLimit(orgId: string, limitPerMinute: number): RateLimitResult {
  const now = Date.now()
  const windowMs = 60_000 // 1 minute window
  const key = `rl:${orgId}`

  let entry = store.get(key)

  if (!entry || now - entry.windowStart >= windowMs) {
    entry = { count: 0, windowStart: now }
  }

  const resetAt = new Date(entry.windowStart + windowMs)
  const remaining = Math.max(0, limitPerMinute - entry.count)

  if (entry.count >= limitPerMinute) {
    const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000)
    return { allowed: false, limit: limitPerMinute, remaining: 0, resetAt, retryAfter }
  }

  entry.count++
  store.set(key, entry)

  return {
    allowed: true,
    limit: limitPerMinute,
    remaining: limitPerMinute - entry.count,
    resetAt,
  }
}

/**
 * Simple in-memory token bucket rate limiter.
 * Designed for edge/middleware compatibility.
 */

interface TokenBucket {
  tokens: number
  lastRefill: number
}

interface RateLimitConfig {
  maxTokens: number
  refillRate: number // tokens per second
}

/** Per-endpoint rate limit configurations */
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // Auth endpoints: 10 requests per minute per IP
  auth: { maxTokens: 10, refillRate: 10 / 60 },
  // AI endpoints: 30 requests per minute per user
  ai: { maxTokens: 30, refillRate: 30 / 60 },
  // General API: 100 requests per minute per IP
  general: { maxTokens: 100, refillRate: 100 / 60 },
}

// In-memory store: key -> bucket
const store = new Map<string, TokenBucket>()

// Cleanup interval: remove stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
const STALE_THRESHOLD = 10 * 60 * 1000 // 10 minutes of inactivity = stale

let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now

  for (const [key, bucket] of store) {
    if (now - bucket.lastRefill > STALE_THRESHOLD) {
      store.delete(key)
    }
  }
}

/**
 * Check if a request should be rate-limited.
 * Returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanup()

  const now = Date.now()
  let bucket = store.get(key)

  if (!bucket) {
    bucket = { tokens: config.maxTokens, lastRefill: now }
    store.set(key, bucket)
  }

  // Refill tokens based on time elapsed
  const elapsedSeconds = (now - bucket.lastRefill) / 1000
  const tokensToAdd = elapsedSeconds * config.refillRate
  bucket.tokens = Math.min(config.maxTokens, bucket.tokens + tokensToAdd)
  bucket.lastRefill = now

  // Try to consume a token
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1
    const resetAt = now + Math.ceil((config.maxTokens - bucket.tokens) / config.refillRate) * 1000
    return { allowed: true, remaining: Math.floor(bucket.tokens), resetAt }
  }

  // Rate limited
  const waitSeconds = (1 - bucket.tokens) / config.refillRate
  return { allowed: false, remaining: 0, resetAt: now + Math.ceil(waitSeconds) * 1000 }
}

/**
 * Determine which rate limit category applies to a given path.
 */
export function getRateLimitCategory(pathname: string): string {
  if (pathname.startsWith('/api/auth/')) return 'auth'
  if (pathname.startsWith('/api/ai/')) return 'ai'
  return 'general'
}

/**
 * Generate a rate limit key from the category and identifier (IP or userId).
 */
export function getRateLimitKey(category: string, identifier: string): string {
  return `${category}:${identifier}`
}

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth-helpers'
import { getSecurityHeaders } from '@/lib/security-headers'
import { checkRateLimit, getRateLimitCategory, getRateLimitKey, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit'

export const config = {
  matcher: ['/api/:path*'],
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // ─── 1. Security Headers ──────────────────────────────────────────────
  const securityHeaders = getSecurityHeaders()
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value)
  }

  // ─── 2. Rate Limiting ─────────────────────────────────────────────────
  const category = getRateLimitCategory(pathname)
  const config = RATE_LIMIT_CONFIGS[category]
  // Use IP for rate limiting; for AI endpoints, try userId from cookie first
  let identifier = request.ip || 'unknown'
  if (category === 'ai') {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    if (token) {
      try {
        const session = await verifySessionToken(token)
        if (session) {
          identifier = session.userId
        }
      } catch {
        // fall back to IP
      }
    }
  }

  const rateLimitKey = getRateLimitKey(category, identifier)
  const rateLimitResult = checkRateLimit(rateLimitKey, config)

  // Set rate limit headers
  response.headers.set('X-RateLimit-Limit', String(config.maxTokens))
  response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining))
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateLimitResult.resetAt / 1000)))

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
          ...securityHeaders,
        },
      }
    )
  }

  // ─── 3. Route Protection ──────────────────────────────────────────────

  // Protect /api/admin/* routes
  if (pathname.startsWith('/api/admin/')) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const session = await verifySessionToken(token)

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      )
    }

    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Add session info to request headers for downstream use
    response.headers.set('x-session-user-id', session.userId)
    response.headers.set('x-session-role', session.role)
  }

  // Protect /api/teacher/* routes
  if (pathname.startsWith('/api/teacher/')) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const session = await verifySessionToken(token)

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      )
    }

    if (session.role !== 'teacher' && session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Teacher or admin access required' },
        { status: 403 }
      )
    }

    // Add session info to request headers for downstream use
    response.headers.set('x-session-user-id', session.userId)
    response.headers.set('x-session-role', session.role)
  }

  return response
}

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { SignJWT, jwtVerify } from 'jose'

// ─── JWT Configuration ────────────────────────────────────────────────────
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'ssa-dev-secret-change-in-production-abc123xyz'
)
const JWT_EXPIRATION = '7d'
export const SESSION_COOKIE_NAME = 'ssa_session'

export interface SessionPayload {
  userId: string
  role: string
  exp?: number
}

// ─── JWT Sign / Verify ────────────────────────────────────────────────────

export async function signSessionToken(payload: { userId: string; role: string }): Promise<string> {
  return new SignJWT({ userId: payload.userId, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(JWT_SECRET)
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      userId: payload.userId as string,
      role: payload.role as string,
      exp: payload.exp,
    }
  } catch {
    return null
  }
}

// ─── Cookie Helpers ───────────────────────────────────────────────────────

export interface CookieOptions {
  httpOnly: boolean
  secure: boolean
  sameSite: 'strict' | 'lax' | 'none'
  path: string
  maxAge: number
}

function getCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  }
}

/**
 * Build a Set-Cookie header string for the session token.
 */
export function setSessionCookie(token: string): string {
  const opts = getCookieOptions()
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    `Path=${opts.path}`,
    `Max-Age=${opts.maxAge}`,
    `SameSite=${opts.sameSite}`,
  ]
  if (opts.httpOnly) parts.push('HttpOnly')
  if (opts.secure) parts.push('Secure')
  return parts.join('; ')
}

/**
 * Build a Set-Cookie header string to clear the session cookie.
 */
export function clearSessionCookie(): string {
  const opts = getCookieOptions()
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    `Path=${opts.path}`,
    'Max-Age=0',
    `SameSite=${opts.sameSite}`,
  ]
  if (opts.httpOnly) parts.push('HttpOnly')
  if (opts.secure) parts.push('Secure')
  return parts.join('; ')
}

// ─── Session Verification (from cookie) ───────────────────────────────────

/**
 * Verify session from the HttpOnly cookie.
 * Returns the session payload if valid, null otherwise.
 */
export async function verifySession(request: Request): Promise<SessionPayload | null> {
  try {
    const cookieHeader = request.headers.get('cookie') || ''
    const token = extractCookieValue(cookieHeader, SESSION_COOKIE_NAME)

    if (!token) return null

    return await verifySessionToken(token)
  } catch {
    return null
  }
}

/**
 * Extract a cookie value from the Cookie header string.
 */
function extractCookieValue(cookieHeader: string, name: string): string | null {
  const cookies = cookieHeader.split(';')
  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.trim().split('=')
    if (key === name) {
      return valueParts.join('=')
    }
  }
  return null
}

// ─── Role Verification (cookie-based, with fallback to body/query) ────────

export async function verifyAdmin(request: Request): Promise<{ authorized: boolean; error?: NextResponse }> {
  try {
    // 1. Try cookie-based session first (secure)
    const session = await verifySession(request)

    if (session) {
      if (session.role !== 'admin') {
        return { authorized: false, error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
      }

      // Verify user still exists and is not banned
      const user = await db.user.findUnique({
        where: { id: session.userId },
        select: { role: true, isBanned: true },
      })

      if (!user || user.isBanned) {
        return { authorized: false, error: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }) }
      }

      return { authorized: true }
    }

    // 2. Fallback: read userId from query/body (legacy support, less secure)
    const url = new URL(request.url)
    let userId = url.searchParams.get('userId')

    if (!userId && request.method !== 'GET') {
      try {
        const body = await request.clone().json()
        userId = body.userId
      } catch {
        // ignore
      }
    }

    if (!userId) {
      return { authorized: false, error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }
    }

    const user = await db.user.findUnique({ where: { id: userId }, select: { role: true, isBanned: true } })

    if (!user || user.isBanned) {
      return { authorized: false, error: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }) }
    }

    if (user.role !== 'admin') {
      return { authorized: false, error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
    }

    return { authorized: true }
  } catch {
    return { authorized: false, error: NextResponse.json({ error: 'Authentication failed' }, { status: 401 }) }
  }
}

/**
 * Get the authenticated user's ID from the session cookie.
 * Returns null if no valid session exists.
 * Use this for ownership verification on student-facing routes.
 */
export async function getSessionUserId(request: Request): Promise<string | null> {
  try {
    const session = await verifySession(request)
    if (!session) return null

    // Verify user still exists and is not banned
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { id: true, isBanned: true },
    })

    if (!user || user.isBanned) return null
    return user.id
  } catch {
    return null
  }
}

/**
 * Verify that the authenticated session user matches the requested userId.
 * Prevents IDOR attacks where users could access other users' resources.
 */
export async function verifyOwnership(request: Request, resourceUserId: string): Promise<boolean> {
  const sessionUserId = await getSessionUserId(request)
  if (!sessionUserId) return false
  return sessionUserId === resourceUserId
}

export async function verifyTeacherOrAdmin(request: Request): Promise<{ authorized: boolean; error?: NextResponse }> {
  try {
    // 1. Try cookie-based session first (secure)
    const session = await verifySession(request)

    if (session) {
      if (session.role !== 'teacher' && session.role !== 'admin') {
        return { authorized: false, error: NextResponse.json({ error: 'Teacher or admin access required' }, { status: 403 }) }
      }

      // Verify user still exists and is not banned
      const user = await db.user.findUnique({
        where: { id: session.userId },
        select: { role: true, isBanned: true },
      })

      if (!user || user.isBanned) {
        return { authorized: false, error: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }) }
      }

      return { authorized: true }
    }

    // 2. Fallback: read userId from query/body (legacy support)
    const url = new URL(request.url)
    let userId = url.searchParams.get('userId')

    if (!userId && request.method !== 'GET') {
      try {
        const body = await request.clone().json()
        userId = body.userId || body.ownerId || body.creatorId
      } catch {
        // ignore
      }
    }

    if (!userId) {
      return { authorized: false, error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }
    }

    const user = await db.user.findUnique({ where: { id: userId }, select: { role: true, isBanned: true } })

    if (!user || user.isBanned) {
      return { authorized: false, error: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }) }
    }

    if (user.role !== 'teacher' && user.role !== 'admin') {
      return { authorized: false, error: NextResponse.json({ error: 'Teacher or admin access required' }, { status: 403 }) }
    }

    return { authorized: true }
  } catch {
    return { authorized: false, error: NextResponse.json({ error: 'Authentication failed' }, { status: 401 }) }
  }
}

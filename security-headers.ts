/**
 * Security headers configuration for SSA application.
 * Applied to all responses via middleware.
 */

export function getSecurityHeaders(): Record<string, string> {
  const isProduction = process.env.NODE_ENV === 'production'

  const headers: Record<string, string> = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  }

  // Content-Security-Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-inline and unsafe-eval for HMR and chunks
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Tailwind + Google Fonts
    "font-src 'self' https://fonts.gstatic.com", // Google Fonts
    "img-src 'self' data: blob: https:", // Allow data URIs and external images
    "connect-src 'self' https:", // API calls
    "frame-ancestors 'none'", // Equivalent to X-Frame-Options: DENY
    "base-uri 'self'",
    "form-action 'self'",
  ]

  if (isProduction) {
    // In development, Next.js HMR needs websocket connections
    cspDirectives.push("script-src 'self' 'unsafe-inline' 'unsafe-eval'")
  }

  headers['Content-Security-Policy'] = cspDirectives.join('; ')

  // Strict-Transport-Security only in production
  if (isProduction) {
    headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload'
  }

  return headers
}

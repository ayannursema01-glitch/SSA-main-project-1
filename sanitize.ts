/**
 * Sanitizes user input to prevent XSS attacks.
 * Strips HTML tags, script content, and dangerous attributes.
 */
export function sanitizeInput(input: string): string {
  if (!input) return input
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/<[^>]+>/g, (match) => {
      // Allow safe tags: br, p, b, i, em, strong, ul, ol, li, code, pre, h1-h6, blockquote
      if (/^<\/?(br|p|b|i|em|strong|ul|ol|li|code|pre|h[1-6]|blockquote)\s*\/?>/i.test(match)) {
        return match
      }
      return ''
    })
    .trim()
}

/**
 * Sanitizes MDX content - more permissive for rich text but still safe
 */
export function sanitizeMDX(content: string): string {
  if (!content) return content
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .trim()
}

import { ZodType, ZodError } from 'zod'
import { NextResponse } from 'next/server'

/**
 * Validates request body against a Zod schema.
 * Returns typed data on success, or a 400 NextResponse on failure.
 */
export function validateBody<T>(
  schema: ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: NextResponse } {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')
      return {
        success: false,
        error: NextResponse.json(
          { error: `Validation failed: ${errors}` },
          { status: 400 }
        ),
      }
    }
    return {
      success: false,
      error: NextResponse.json({ error: 'Invalid input' }, { status: 400 }),
    }
  }
}

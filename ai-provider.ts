/**
 * AI Provider — unified abstraction over Google Gemini API (production)
 * and z-ai-web-dev-sdk (sandbox fallback).
 *
 * Set GOOGLE_AI_API_KEY in your .env to use Google Gemini.
 * If not set, falls back to z-ai-web-dev-sdk (sandbox only).
 *
 * Features:
 * - Automatic retry with exponential backoff for 429 (rate limit) errors
 * - Model fallback chain: gemini-2.0-flash → gemini-1.5-flash → z-ai
 * - Timeout protection for API calls
 * - Graceful degradation when quota is exceeded
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

// ─── Provider Detection ────────────────────────────────────────────────

const GOOGLE_API_KEY = process.env.GOOGLE_AI_API_KEY ?? ''
export const isGoogleProvider = GOOGLE_API_KEY.length > 0

// ─── Model Fallback Chain ─────────────────────────────────────────────

const MODEL_FALLBACK_CHAIN = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-2.5-flash-preview-05-20',
] as const

// Track which models are currently rate-limited (with cooldown expiry)
const rateLimitedModels = new Map<string, number>()

// ─── Retry Configuration ──────────────────────────────────────────────

const MAX_RETRIES = 3
const BASE_DELAY_MS = 2000
const MAX_DELAY_MS = 30000
const API_TIMEOUT_MS = 30000 // 30s timeout for API calls

// ─── Google Gemini Singleton ───────────────────────────────────────────

let genAI: GoogleGenerativeAI | null = null

function getGemini(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(GOOGLE_API_KEY)
  }
  return genAI
}

// ─── z-ai-web-dev-sdk Singleton (sandbox fallback) ─────────────────────

let zaiInstance: Awaited<ReturnType<typeof import('z-ai-web-dev-sdk').default.create>> | null = null

async function getZAI() {
  if (!zaiInstance) {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    zaiInstance = await ZAI.create()
  }
  return zaiInstance
}

// ─── Types ─────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatCompletionResult {
  content: string
}

export interface TTSResult {
  audioBuffer: Buffer
  contentType: string
}

// ─── Utility: Sleep ────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Utility: Check if error is a rate limit (429) ────────────────────

function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes('429') ||
      msg.includes('too many requests') ||
      msg.includes('quota') ||
      msg.includes('rate limit')
    )
  }
  return false
}

// ─── Utility: Get retry delay from error (parse Google's retryDelay) ───

function getRetryDelayFromError(error: unknown, attempt: number): number {
  // Try to parse Google's suggested retryDelay
  if (error instanceof Error) {
    const retryMatch = error.message.match(/retryDelay["\s:]+(\d+)s/i)
    if (retryMatch) {
      const suggestedSeconds = parseInt(retryMatch[1], 10)
      if (suggestedSeconds > 0 && suggestedSeconds < 120) {
        return suggestedSeconds * 1000
      }
    }
  }
  // Exponential backoff with jitter
  const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS)
  const jitter = delay * 0.2 * Math.random()
  return delay + jitter
}

// ─── Utility: Mark model as rate-limited ───────────────────────────────

function markModelRateLimited(modelName: string, durationMs: number): void {
  const expiresAt = Date.now() + durationMs
  rateLimitedModels.set(modelName, expiresAt)
  console.warn(`[AI Provider] Model ${modelName} rate-limited for ${Math.round(durationMs / 1000)}s`)
}

// ─── Utility: Check if model is currently rate-limited ─────────────────

function isModelRateLimited(modelName: string): boolean {
  const expiresAt = rateLimitedModels.get(modelName)
  if (!expiresAt) return false
  if (Date.now() > expiresAt) {
    rateLimitedModels.delete(modelName)
    return false
  }
  return true
}

// ─── Utility: Get next available model from fallback chain ─────────────

function getNextAvailableModel(preferredModel?: string): string | null {
  // If a specific model was requested, check if it's available
  if (preferredModel && !isModelRateLimited(preferredModel)) {
    return preferredModel
  }

  // Try the fallback chain
  for (const model of MODEL_FALLBACK_CHAIN) {
    if (!isModelRateLimited(model)) {
      return model
    }
  }

  // All models rate-limited
  return null
}

// ─── Utility: Convert messages to Gemini format ────────────────────────

function messagesToGeminiFormat(messages: ChatMessage[]): {
  systemInstruction: string | undefined
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>
} {
  let systemInstruction: string | undefined
  const geminiMessages: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = msg.content
    } else {
      geminiMessages.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })
    }
  }

  // Gemini requires alternating user/model messages.
  // Merge consecutive same-role messages.
  const merged: typeof geminiMessages = []
  for (const msg of geminiMessages) {
    const last = merged[merged.length - 1]
    if (last && last.role === msg.role) {
      last.parts.push(...msg.parts)
    } else {
      merged.push({ ...msg, parts: [...msg.parts] })
    }
  }

  // Gemini requires starting with a user message
  if (merged.length > 0 && merged[0].role !== 'user') {
    merged.unshift({ role: 'user', parts: [{ text: 'Please respond.' }] })
  }

  return { systemInstruction, contents: merged }
}

// ─── Chat Completions ──────────────────────────────────────────────────

export async function createChatCompletion(
  messages: ChatMessage[],
  options?: { model?: string; temperature?: number; maxTokens?: number }
): Promise<ChatCompletionResult> {
  if (isGoogleProvider) {
    try {
      return await createGeminiChatCompletionWithRetry(messages, options)
    } catch (error) {
      console.warn('[AI Provider] Google Gemini failed, falling back to z-ai:', error instanceof Error ? error.message : error)
      return createZAIChatCompletion(messages)
    }
  }
  return createZAIChatCompletion(messages)
}

async function createGeminiChatCompletionWithRetry(
  messages: ChatMessage[],
  options?: { model?: string; temperature?: number; maxTokens?: number }
): Promise<ChatCompletionResult> {
  const preferredModel = options?.model ?? 'gemini-2.0-flash'

  // Strategy: Try each available model in the fallback chain immediately.
  // Only wait/retry if ALL models are rate-limited.
  const modelsToTry = MODEL_FALLBACK_CHAIN.filter((m) => !isModelRateLimited(m))

  // Always include preferred model first if not rate-limited
  if (!isModelRateLimited(preferredModel) && !modelsToTry.includes(preferredModel as typeof MODEL_FALLBACK_CHAIN[number])) {
    modelsToTry.unshift(preferredModel as typeof MODEL_FALLBACK_CHAIN[number])
  }

  // Deduplicate
  const uniqueModels = [...new Set(modelsToTry)]

  if (uniqueModels.length === 0) {
    // All Google models rate-limited, fall through to z-ai
    throw new Error('All Google Gemini models are currently rate-limited. Falling back to alternative provider.')
  }

  const { systemInstruction, contents } = messagesToGeminiFormat(messages)
  let lastError: Error | null = null

  // Try each model in the chain
  for (const modelName of uniqueModels) {
    try {
      if (modelName !== preferredModel) {
        console.log(`[AI Provider] Trying fallback model: ${modelName} (preferred: ${preferredModel})`)
      }

      const gemini = getGemini()
      const model = gemini.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 8192,
        },
      })

      // Add timeout protection
      const result = await Promise.race([
        model.generateContent({
          contents,
          ...(systemInstruction ? { systemInstruction } : {}),
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('API request timed out')), API_TIMEOUT_MS)
        ),
      ])

      const text = result.response.text()
      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from AI model')
      }
      return { content: text }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (isRateLimitError(lastError)) {
        console.warn(`[AI Provider] Rate limited on ${modelName}, trying next model...`)
        // Mark this model as rate-limited (shorter cooldown for fast recovery)
        markModelRateLimited(modelName, 30000) // 30s cooldown
        // Continue to next model immediately
        continue
      } else if (lastError.message.includes('timed out')) {
        console.warn(`[AI Provider] Request timed out on ${modelName}, trying next model...`)
        continue
      } else {
        // Non-retryable error on this model, try next
        console.warn(`[AI Provider] Error on ${modelName}: ${lastError.message}`)
        continue
      }
    }
  }

  // All models in chain failed. If rate-limited, wait and try one more time with short delay.
  if (lastError && isRateLimitError(lastError)) {
    console.warn('[AI Provider] All models rate-limited, waiting 5s before final retry...')
    await sleep(5000)

    // Check if any model is now available
    const retryModel = getNextAvailableModel(preferredModel)
    if (retryModel) {
      try {
        const gemini = getGemini()
        const model = gemini.getGenerativeModel({
          model: retryModel,
          generationConfig: {
            temperature: options?.temperature ?? 0.7,
            maxOutputTokens: options?.maxTokens ?? 8192,
          },
        })

        const result = await Promise.race([
          model.generateContent({
            contents,
            ...(systemInstruction ? { systemInstruction } : {}),
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('API request timed out')), API_TIMEOUT_MS)
          ),
        ])

        const text = result.response.text()
        if (text && text.trim().length > 0) {
          return { content: text }
        }
      } catch {
        // Final retry failed
      }
    }
  }

  throw lastError ?? new Error('Failed to get response from AI after all retries')
}

async function createZAIChatCompletion(
  messages: ChatMessage[]
): Promise<ChatCompletionResult> {
  const zai = await getZAI()

  const completion = await zai.chat.completions.create({
    messages,
    thinking: { type: 'disabled' },
  })

  const content = completion.choices[0]?.message?.content ?? ''
  return { content }
}

// ─── Text-to-Speech ────────────────────────────────────────────────────

const GEMINI_TTS_VOICES = [
  'Kore', 'Aoede', 'Charon', 'Puck', 'Enceladus',
  'Iapetus', 'Orus', 'Zephyr', 'Sulafat', 'Zubenelgenubi',
  'Achernar', 'Algieba', 'Despina', 'Erinome', 'Fenrir',
  'Leda', 'Sadaltager', 'Sedna', 'Umbriel', 'Vindemiatrix',
] as const

export type GeminiVoice = (typeof GEMINI_TTS_VOICES)[number]

export function isValidGeminiVoice(voice: string): voice is GeminiVoice {
  return GEMINI_TTS_VOICES.includes(voice as GeminiVoice)
}

export { GEMINI_TTS_VOICES }

export async function createTTS(
  text: string,
  options?: { voice?: string; speed?: number }
): Promise<TTSResult> {
  if (isGoogleProvider) {
    try {
      return await createGeminiTTS(text, options)
    } catch (error) {
      console.warn('[AI Provider] Gemini TTS failed, falling back to z-ai:', error instanceof Error ? error.message : error)
      return createZAITTS(text, options)
    }
  }
  return createZAITTS(text, options)
}

async function createGeminiTTS(
  text: string,
  options?: { voice?: string; speed?: number }
): Promise<TTSResult> {
  const apiKey = GOOGLE_API_KEY
  const voiceName = options?.voice ?? 'Kore'

  // Use the REST API directly for Gemini TTS since SDK support may vary
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: text,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName,
            },
          },
        },
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Gemini TTS Error]', response.status, errorText)
    throw new Error(`Gemini TTS API error: ${response.status}`)
  }

  const data = await response.json()

  // Extract audio data from response
  const candidate = data.candidates?.[0]
  const audioPart = candidate?.content?.parts?.find(
    (p: Record<string, unknown>) => p.inlineData
  )

  if (!audioPart?.inlineData?.data) {
    throw new Error('No audio data in TTS response')
  }

  // The audio is base64-encoded PCM/MP3
  const audioBuffer = Buffer.from(audioPart.inlineData.data, 'base64')
  const mimeType = audioPart.inlineData.mimeType ?? 'audio/mp3'

  return {
    audioBuffer,
    contentType: mimeType,
  }
}

async function createZAITTS(
  text: string,
  options?: { voice?: string; speed?: number }
): Promise<TTSResult> {
  const zai = await getZAI()

  const voice = (options?.voice ?? 'kazi') as string
  const speed = options?.speed ?? 1.0

  const response = await zai.audio.tts.create({
    input: text,
    voice,
    speed,
    response_format: 'wav',
    stream: false,
  })

  const arrayBuffer = await response.arrayBuffer()
  return {
    audioBuffer: Buffer.from(new Uint8Array(arrayBuffer)),
    contentType: 'audio/wav',
  }
}

// ─── Streaming Chat (for real-time typing effect) ──────────────────────

export async function createStreamingChatCompletion(
  messages: ChatMessage[],
  options?: { model?: string; temperature?: number }
): Promise<ReadableStream<Uint8Array>> {
  if (isGoogleProvider) {
    try {
      return await createGeminiStreamingChat(messages, options)
    } catch (error) {
      console.warn('[AI Provider] Google streaming failed, falling back to z-ai:', error instanceof Error ? error.message : error)
      return createZAIStreamingChat(messages)
    }
  }
  // For z-ai, we'll do a non-streaming call and wrap it
  return createZAIStreamingChat(messages)
}

async function createGeminiStreamingChat(
  messages: ChatMessage[],
  options?: { model?: string; temperature?: number }
): Promise<ReadableStream<Uint8Array>> {
  const preferredModel = options?.model ?? 'gemini-2.0-flash'
  const modelName = getNextAvailableModel(preferredModel)

  if (!modelName) {
    throw new Error('All Google Gemini models are currently rate-limited. Falling back to alternative provider.')
  }

  if (modelName !== preferredModel) {
    console.log(`[AI Provider] Stream: Using fallback model: ${modelName} (preferred: ${preferredModel})`)
  }

  const gemini = getGemini()
  const { systemInstruction, contents } = messagesToGeminiFormat(messages)

  const model = gemini.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
    },
  })

  const result = await model.generateContentStream({
    contents,
    ...(systemInstruction ? { systemInstruction } : {}),
  })

  // Convert Gemini stream to ReadableStream
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text()
          if (text) {
            controller.enqueue(encoder.encode(text))
          }
        }
        controller.close()
      } catch (error) {
        if (isRateLimitError(error)) {
          markModelRateLimited(modelName, 30000)
        }
        controller.error(error)
      }
    },
  })

  return stream
}

async function createZAIStreamingChat(
  messages: ChatMessage[]
): Promise<ReadableStream<Uint8Array>> {
  const result = await createZAIChatCompletion(messages)

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(result.content))
      controller.close()
    },
  })

  return stream
}

// ─── Health Check ──────────────────────────────────────────────────────

export function getAIProviderStatus(): {
  provider: string
  modelsAvailable: string[]
  modelsRateLimited: Array<{ model: string; expiresAt: Date }>
} {
  if (!isGoogleProvider) {
    return {
      provider: 'z-ai-web-dev-sdk',
      modelsAvailable: ['z-ai-default'],
      modelsRateLimited: [],
    }
  }

  const available = MODEL_FALLBACK_CHAIN.filter((m) => !isModelRateLimited(m))
  const limited = Array.from(rateLimitedModels.entries())
    .filter(([, expiresAt]) => Date.now() < expiresAt)
    .map(([model, expiresAt]) => ({ model, expiresAt: new Date(expiresAt) }))

  return {
    provider: 'Google Gemini',
    modelsAvailable: available,
    modelsRateLimited: limited,
  }
}

'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  X,
  BookOpen,
  HelpCircle,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  Trophy,
  ChevronRight,
  ChevronLeft,
  FileText,
  Brain,
  ClipboardPaste,
  Hash,
  RotateCcw,
  Zap,
  Tag,
  Layers,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'

import { type QuizQuestion } from '@/store/use-app-store'
import { toast } from 'sonner'

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface PdfIntelligenceProps {
  fileName: string
  fileContent: string
  onClose: () => void
}

interface ChatMsg {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

type TabId = 'summary' | 'keywords' | 'flashcards' | 'quiz' | 'chat'

interface KeywordItem {
  term: string
  definition: string
  importance: 'high' | 'medium' | 'low'
}

interface FlashcardItem {
  front: string
  back: string
  category: string
}

/* ═══════════════════════════════════════════════════════════════════
   Shimmer Loading Effect
   ═══════════════════════════════════════════════════════════════════ */

function ShimmerLoader({ message = 'Analyzing document...' }: { message?: string }) {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3 mb-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="shrink-0"
        >
          <Brain className="size-6 text-ssa-purple" />
        </motion.div>
        <div>
          <p className="text-sm font-medium text-foreground">{message}</p>
          <p className="text-xs text-muted-foreground">This may take a few seconds</p>
        </div>
      </div>
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.15, duration: 0.4 }}
        >
          <div className="space-y-2">
            <div className="h-4 bg-muted/60 rounded-md animate-pulse" style={{ width: `${70 + Math.random() * 30}%` }} />
            <div className="h-4 bg-muted/40 rounded-md animate-pulse" style={{ width: `${50 + Math.random() * 40}%` }} />
            {i % 2 === 0 && (
              <div className="h-4 bg-muted/30 rounded-md animate-pulse" style={{ width: `${30 + Math.random() * 30}%` }} />
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Error State Component
   ═══════════════════════════════════════════════════════════════════ */

function ErrorState({
  title,
  error,
  onRetry,
}: {
  title: string
  error: string
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="size-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
        <XCircle className="size-7 text-red-500" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">{error}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="gap-1.5 border-ssa-purple/30 hover:bg-ssa-purple/5"
      >
        <RefreshCw className="size-3.5" />
        Try Again
      </Button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Markdown Renderer Styles
   ═══════════════════════════════════════════════════════════════════ */

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none
      prose-headings:text-foreground prose-headings:font-semibold
      prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3 prose-h2:pb-1 prose-h2:border-b prose-h2:border-border/30
      prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2
      prose-p:text-foreground/85 prose-p:leading-relaxed prose-p:mb-3
      prose-li:text-foreground/80 prose-li:mb-1
      prose-strong:text-foreground prose-strong:font-semibold
      prose-code:text-ssa-purple prose-code:bg-ssa-purple/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono
      prose-pre:bg-muted/40 prose-pre:border prose-pre:border-border/30 prose-pre:rounded-xl
      prose-blockquote:border-l-ssa-purple prose-blockquote:bg-ssa-purple/5 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
      prose-ul:my-2 prose-ol:my-2
      prose-a:text-ssa-purple prose-a:no-underline hover:prose-a:underline
    ">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Summary Tab
   ═══════════════════════════════════════════════════════════════════ */

function SummaryTab({
  fileContent,
}: {
  fileContent: string
  fileName: string
}) {
  const [note, setNote] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNote = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNote(null)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 90000)

    try {
      const response = await fetch('/api/ai/pdf-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fileContent, mode: 'summary' }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const errorMsg = data.error || data.details || 'Failed to generate summary'
        throw new Error(errorMsg)
      }

      const text = await response.text()
      if (!text || text.trim().length === 0) {
        throw new Error('AI returned an empty response. Please try again.')
      }
      setNote(text)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      if (msg.includes('abort') || msg.includes('timeout')) {
        setError('Request timed out. The AI is busy — please try again in a moment.')
      } else if (msg.includes('rate-limited') || msg.includes('429') || msg.includes('quota')) {
        setError('AI is currently experiencing high demand. Please try again in a minute.')
      } else {
        setError(msg)
      }
      toast.error('Failed to generate summary', { description: msg.slice(0, 100) })
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [fileContent])

  // Auto-fetch on mount
  useEffect(() => {
    fetchNote()
  }, [fetchNote])

  return (
    <div className="flex flex-col h-full min-h-0">
      {loading && <ShimmerLoader message="Creating your study summary..." />}

      {error && !loading && (
        <ErrorState title="Failed to generate summary" error={error} onRetry={fetchNote} />
      )}

      {note && !loading && (
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-ssa-purple" />
                <h3 className="text-sm font-semibold text-foreground">Study Summary</h3>
                <Badge variant="secondary" className="h-5 px-1.5 text-[9px] bg-ssa-purple/10 text-ssa-purple border-0">
                  AI Generated
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchNote}
                disabled={loading}
                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-ssa-purple"
              >
                <RefreshCw className={cn('size-3', loading && 'animate-spin')} />
                Regenerate
              </Button>
            </div>

            {/* Markdown Content */}
            <MarkdownContent content={note} />
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Keywords Tab
   ═══════════════════════════════════════════════════════════════════ */

function KeywordsTab({
  fileContent,
}: {
  fileContent: string
  fileName: string
}) {
  const [keywords, setKeywords] = useState<KeywordItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchKeywords = useCallback(async () => {
    setLoading(true)
    setError(null)
    setKeywords([])

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 90000)

    try {
      const response = await fetch('/api/ai/pdf-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fileContent, mode: 'keywords' }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const errorMsg = data.error || data.details || 'Failed to extract keywords'
        throw new Error(errorMsg)
      }

      const data = await response.json()

      if (data.rawText) {
        throw new Error('AI returned invalid format. Please try again.')
      }

      const items: KeywordItem[] = (data.content || []).map(
        (item: { term: string; definition: string; importance: string }) => ({
          term: item.term,
          definition: item.definition,
          importance: ['high', 'medium', 'low'].includes(item.importance)
            ? item.importance as 'high' | 'medium' | 'low'
            : 'medium',
        })
      )

      if (items.length === 0) {
        throw new Error('No keywords were extracted')
      }

      setKeywords(items)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      if (msg.includes('abort') || msg.includes('timeout')) {
        setError('Request timed out. The AI is busy — please try again in a moment.')
      } else if (msg.includes('rate-limited') || msg.includes('429') || msg.includes('quota')) {
        setError('AI is currently experiencing high demand. Please try again in a minute.')
      } else {
        setError(msg)
      }
      toast.error('Failed to extract keywords', { description: msg.slice(0, 100) })
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [fileContent])

  useEffect(() => {
    fetchKeywords()
  }, [fetchKeywords])

  const importanceConfig = {
    high: { label: 'High', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
    medium: { label: 'Medium', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    low: { label: 'Low', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {loading && <ShimmerLoader message="Extracting key terms and concepts..." />}

      {error && !loading && (
        <ErrorState title="Failed to extract keywords" error={error} onRetry={fetchKeywords} />
      )}

      {keywords.length > 0 && !loading && (
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Hash className="size-4 text-ssa-cyan" />
                <h3 className="text-sm font-semibold text-foreground">Key Terms</h3>
                <Badge variant="secondary" className="h-5 px-1.5 text-[9px] bg-ssa-cyan/10 text-ssa-cyan border-0">
                  {keywords.length} terms
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchKeywords}
                disabled={loading}
                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-ssa-cyan"
              >
                <RefreshCw className={cn('size-3', loading && 'animate-spin')} />
                Refresh
              </Button>
            </div>

            {/* Keywords list */}
            {keywords.map((kw, i) => {
              const imp = importanceConfig[kw.importance]
              return (
                <motion.div
                  key={kw.term}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                >
                  <Card className="glass-card border-border/30 hover:border-ssa-cyan/20 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{kw.term}</p>
                            <Badge variant="secondary" className={cn('h-4 px-1.5 text-[9px] font-medium border', imp.color)}>
                              {imp.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{kw.definition}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Flashcards Tab
   ═══════════════════════════════════════════════════════════════════ */

function FlashcardsTab({
  fileContent,
}: {
  fileContent: string
  fileName: string
}) {
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  const fetchFlashcards = useCallback(async () => {
    setLoading(true)
    setError(null)
    setFlashcards([])
    setCurrentIndex(0)
    setIsFlipped(false)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 90000)

    try {
      const response = await fetch('/api/ai/pdf-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fileContent, mode: 'flashcards' }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const errorMsg = data.error || data.details || 'Failed to generate flashcards'
        throw new Error(errorMsg)
      }

      const data = await response.json()

      if (data.rawText) {
        throw new Error('AI returned invalid format. Please try again.')
      }

      const cards: FlashcardItem[] = (data.content || []).map(
        (item: { front: string; back: string; category: string }) => ({
          front: item.front,
          back: item.back,
          category: item.category || 'General',
        })
      )

      if (cards.length === 0) {
        throw new Error('No flashcards were generated')
      }

      setFlashcards(cards)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      if (msg.includes('abort') || msg.includes('timeout')) {
        setError('Request timed out. The AI is busy — please try again in a moment.')
      } else if (msg.includes('rate-limited') || msg.includes('429') || msg.includes('quota')) {
        setError('AI is currently experiencing high demand. Please try again in a minute.')
      } else {
        setError(msg)
      }
      toast.error('Failed to generate flashcards', { description: msg.slice(0, 100) })
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [fileContent])

  useEffect(() => {
    fetchFlashcards()
  }, [fetchFlashcards])

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev)
  }, [])

  const handleNext = useCallback(() => {
    if (currentIndex < flashcards.length - 1) {
      setIsFlipped(false)
      setCurrentIndex((prev) => prev + 1)
    }
  }, [currentIndex, flashcards.length])

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setIsFlipped(false)
      setCurrentIndex((prev) => prev - 1)
    }
  }, [currentIndex])

  const currentCard = flashcards[currentIndex]

  return (
    <div className="flex flex-col h-full min-h-0">
      {loading && <ShimmerLoader message="Generating flashcards..." />}

      {error && !loading && (
        <ErrorState title="Failed to generate flashcards" error={error} onRetry={fetchFlashcards} />
      )}

      {currentCard && !loading && (
        <div className="flex flex-col h-full min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-ssa-teal" />
              <h3 className="text-sm font-semibold text-foreground">Flashcards</h3>
              <Badge variant="secondary" className="h-4 px-1.5 text-[9px] bg-ssa-teal/10 text-ssa-teal border-0">
                {currentIndex + 1} / {flashcards.length}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchFlashcards}
              disabled={loading}
              className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-ssa-teal"
            >
              <RefreshCw className="size-3" />
              New
            </Button>
          </div>

          {/* Progress */}
          <div className="px-4 pb-2">
            <Progress value={((currentIndex + 1) / flashcards.length) * 100} className="h-1" />
          </div>

          {/* Card area */}
          <div className="flex-1 flex items-center justify-center p-4">
            <motion.div
              className="w-full max-w-md"
              initial={false}
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
            >
              {/* Front of card */}
              <div
                className={cn(
                  'w-full min-h-[220px] rounded-2xl p-6 cursor-pointer transition-shadow',
                  'bg-gradient-to-br from-ssa-indigo/10 via-ssa-purple/10 to-ssa-teal/10',
                  'border border-ssa-purple/20 hover:shadow-lg hover:shadow-ssa-purple/5',
                  !isFlipped ? 'block' : 'hidden'
                )}
                onClick={handleFlip}
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <Badge variant="secondary" className="h-5 px-2 text-[10px] bg-ssa-purple/10 text-ssa-purple border-0">
                    <Tag className="size-2.5 mr-1" />
                    {currentCard.category}
                  </Badge>
                  <p className="text-base font-semibold text-foreground leading-relaxed">
                    {currentCard.front}
                  </p>
                  <p className="text-xs text-muted-foreground mt-auto">
                    Click to reveal answer
                  </p>
                </div>
              </div>

              {/* Back of card */}
              <div
                className={cn(
                  'w-full min-h-[220px] rounded-2xl p-6 cursor-pointer transition-shadow',
                  'bg-gradient-to-br from-ssa-teal/10 via-ssa-cyan/10 to-ssa-indigo/10',
                  'border border-ssa-teal/20 hover:shadow-lg hover:shadow-ssa-teal/5',
                  isFlipped ? 'block' : 'hidden'
                )}
                onClick={handleFlip}
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <Badge variant="secondary" className="h-5 px-2 text-[10px] bg-ssa-teal/10 text-ssa-teal border-0">
                    Answer
                  </Badge>
                  <p className="text-sm text-foreground leading-relaxed">
                    {currentCard.back}
                  </p>
                  <p className="text-xs text-muted-foreground mt-auto">
                    Click to see question
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/30">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="gap-1 border-ssa-purple/30 hover:bg-ssa-purple/5"
            >
              <ChevronLeft className="size-3.5" />
              Prev
            </Button>

            <div className="flex items-center gap-1">
              {flashcards.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setCurrentIndex(i); setIsFlipped(false) }}
                  className={cn(
                    'size-1.5 rounded-full transition-all',
                    i === currentIndex
                      ? 'bg-ssa-purple scale-125'
                      : i < currentIndex
                        ? 'bg-ssa-purple/40'
                        : 'bg-muted-foreground/20'
                  )}
                  aria-label={`Go to card ${i + 1}`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={currentIndex >= flashcards.length - 1}
              className="gap-1 border-ssa-purple/30 hover:bg-ssa-purple/5"
            >
              Next
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Quiz Tab
   ═══════════════════════════════════════════════════════════════════ */

function QuizTab({
  fileContent,
}: {
  fileContent: string
  fileName: string
}) {
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<'loading' | 'playing' | 'results'>('loading')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<string, number>>({})

  const fetchQuiz = useCallback(async () => {
    setLoading(true)
    setError(null)
    setPhase('loading')
    setQuizQuestions([])
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setAnswers({})

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 90000)

    try {
      const response = await fetch('/api/ai/pdf-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fileContent, mode: 'quiz' }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const errorMsg = data.error || data.details || 'Failed to generate quiz'
        throw new Error(errorMsg)
      }

      const data = await response.json()

      if (data.rawText) {
        throw new Error('AI returned invalid format. Please try again.')
      }

      const questions: QuizQuestion[] = (data.content || []).map(
        (item: { question: string; options: string[]; correctAnswer: number; explanation: string }, i: number) => ({
          id: `pdf-quiz-${Date.now()}-${i}`,
          question: item.question,
          options: item.options,
          correctAnswer: item.correctAnswer,
          explanation: item.explanation || '',
        })
      )

      if (questions.length === 0) {
        throw new Error('No quiz questions were generated')
      }

      setQuizQuestions(questions)
      setPhase('playing')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      if (msg.includes('abort') || msg.includes('timeout')) {
        setError('Request timed out. The AI is busy — please try again in a moment.')
      } else if (msg.includes('rate-limited') || msg.includes('429') || msg.includes('quota')) {
        setError('AI is currently experiencing high demand. Please try again in a minute.')
      } else {
        setError(msg)
      }
      toast.error('Failed to generate quiz', { description: msg.slice(0, 100) })
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [fileContent])

  useEffect(() => {
    fetchQuiz()
  }, [fetchQuiz])

  const currentQuestion = quizQuestions[currentIndex]

  const handleAnswer = useCallback(() => {
    if (selectedAnswer === null || !currentQuestion) return

    const newAnswers = { ...answers, [currentQuestion.id]: selectedAnswer }
    setAnswers(newAnswers)

    if (currentIndex >= quizQuestions.length - 1) {
      setPhase('results')
    } else {
      setCurrentIndex(currentIndex + 1)
      setSelectedAnswer(null)
    }
  }, [selectedAnswer, answers, currentIndex, quizQuestions, currentQuestion])

  const score = useMemo(() => {
    return quizQuestions.filter((q) => answers[q.id] === q.correctAnswer).length
  }, [quizQuestions, answers])

  const percentage = quizQuestions.length > 0 ? (score / quizQuestions.length) * 100 : 0

  // Loading phase
  if (phase === 'loading' && !error) {
    return <ShimmerLoader message="Generating quiz questions..." />
  }

  // Error in loading
  if (phase === 'loading' && error) {
    return <ErrorState title="Failed to generate quiz" error={error} onRetry={fetchQuiz} />
  }

  // Results phase
  if (phase === 'results') {
    const getRating = (pct: number) => {
      if (pct >= 80) return { text: 'Excellent!', color: 'text-emerald-500', icon: Trophy }
      if (pct >= 60) return { text: 'Good Job!', color: 'text-ssa-teal', icon: CheckCircle2 }
      if (pct >= 40) return { text: 'Not Bad!', color: 'text-yellow-500', icon: Sparkles }
      return { text: 'Keep Practicing!', color: 'text-orange-500', icon: RotateCcw }
    }
    const rating = getRating(percentage)
    const RatingIcon = rating.icon

    return (
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {/* Score Card */}
          <Card className="glass-card border-border/30">
            <CardContent className="p-6 flex flex-col items-center gap-3">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <RatingIcon className={cn('size-12', rating.color)} />
              </motion.div>
              <h3 className={cn('text-xl font-bold', rating.color)}>{rating.text}</h3>
              <p className="text-sm text-muted-foreground">
                You got <span className="font-bold text-foreground">{score}</span> out of{' '}
                <span className="font-bold text-foreground">{quizQuestions.length}</span> correct
              </p>
              <Progress value={percentage} className="h-2 w-full max-w-[200px]" />
            </CardContent>
          </Card>

          {/* Review */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Review Answers</h4>
            {quizQuestions.map((q, i) => {
              const userAnswer = answers[q.id]
              const isCorrect = userAnswer === q.correctAnswer
              return (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className={cn(
                    'border',
                    isCorrect ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'
                  )}>
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex items-start gap-2">
                        {isCorrect ? (
                          <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <p className="text-xs font-semibold text-foreground">
                            {i + 1}. {q.question}
                          </p>
                          {!isCorrect && (
                            <div className="space-y-0.5">
                              <p className="text-[11px] text-red-500">
                                Your answer: {userAnswer >= 0 ? q.options[userAnswer] : 'No answer'}
                              </p>
                              <p className="text-[11px] text-emerald-500">
                                Correct: {q.options[q.correctAnswer]}
                              </p>
                            </div>
                          )}
                          {q.explanation && (
                            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                              {q.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchQuiz}
              className="flex-1 gap-1.5 border-ssa-purple/30 hover:bg-ssa-purple/5"
            >
              <RefreshCw className="size-3.5" />
              New Quiz
            </Button>
          </div>
        </div>
      </ScrollArea>
    )
  }

  // Playing phase
  if (!currentQuestion) return null

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Progress */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>Question {currentIndex + 1} of {quizQuestions.length}</span>
          <Badge variant="secondary" className="h-4 px-1.5 text-[9px] bg-ssa-purple/10 text-ssa-purple border-0">
            {Math.round(((currentIndex) / quizQuestions.length) * 100)}%
          </Badge>
        </div>
        <Progress value={(currentIndex / quizQuestions.length) * 100} className="h-1.5" />
      </div>

      {/* Question */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* Question Card */}
              <Card className="glass-card border-border/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-ssa-indigo to-ssa-purple p-0.5 shrink-0">
                      <div className="w-full h-full rounded-[5px] bg-background/90 flex items-center justify-center">
                        <span className="text-xs font-bold text-foreground">{currentIndex + 1}</span>
                      </div>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground leading-relaxed">
                      {currentQuestion.question}
                    </h3>
                  </div>
                </CardContent>
              </Card>

              {/* Options */}
              <RadioGroup
                value={selectedAnswer?.toString() ?? ''}
                onValueChange={(v) => setSelectedAnswer(parseInt(v))}
                aria-label="Answer options"
              >
                <div className="space-y-2">
                  {currentQuestion.options.map((option, i) => (
                    <motion.label
                      key={i}
                      whileHover={{ scale: 1.005 }}
                      whileTap={{ scale: 0.995 }}
                      className={cn(
                        'flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-all border-2',
                        selectedAnswer === i
                          ? 'bg-ssa-purple/5 border-ssa-purple/40 shadow-sm'
                          : 'bg-card border-border/20 hover:border-ssa-purple/20'
                      )}
                    >
                      <RadioGroupItem value={i.toString()} id={`pdf-opt-${i}`} />
                      <Label htmlFor={`pdf-opt-${i}`} className="cursor-pointer flex-1 text-xs font-medium">
                        {option}
                      </Label>
                    </motion.label>
                  ))}
                </div>
              </RadioGroup>
            </motion.div>
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Next/Submit Button */}
      <div className="px-4 py-3 border-t border-border/30">
        <Button
          onClick={handleAnswer}
          disabled={selectedAnswer === null}
          className={cn(
            'w-full h-10 text-sm font-semibold',
            currentIndex >= quizQuestions.length - 1
              ? 'bg-gradient-to-r from-ssa-teal to-emerald-500 text-white hover:opacity-90'
              : 'bg-gradient-to-r from-ssa-indigo via-ssa-purple to-ssa-cyan text-white hover:opacity-90'
          )}
        >
          {currentIndex >= quizQuestions.length - 1 ? (
            <>
              <Trophy className="size-4 mr-2" />
              Submit Quiz
            </>
          ) : (
            <>
              Next
              <ChevronRight className="size-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Chat Tab
   ═══════════════════════════════════════════════════════════════════ */

function ChatTab({
  fileContent,
}: {
  fileContent: string
  fileName: string
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return

    const userMsg: ChatMsg = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 90000)

    try {
      const response = await fetch('/api/ai/pdf-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: fileContent,
          mode: 'chat',
          question: userMsg.content,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const errorMsg = data.error || data.details || 'Failed to get response'
        throw new Error(errorMsg)
      }

      const text = await response.text()

      const assistantMsg: ChatMsg = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: text || 'I couldn\'t generate a response. Please try again.',
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Please try again.'
      const displayMsg = msg.includes('abort') || msg.includes('timeout')
        ? 'Request timed out. Please try again.'
        : msg.includes('rate-limited') || msg.includes('429')
          ? 'AI is currently busy. Please try again in a minute.'
          : msg
      const errorMsg: ChatMsg = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `Sorry, I couldn't process your question. ${displayMsg}`,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMsg])
      toast.error('Failed to get AI response')
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [input, loading, fileContent])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  // Suggested questions
  const suggestions = useMemo(() => [
    'Summarize the key points',
    'Explain the main concepts simply',
    'What are the most important takeaways?',
    'Give me examples from this document',
  ], [])

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-ssa-indigo/20 via-ssa-purple/20 to-ssa-cyan/20 border border-ssa-purple/20"
              >
                <MessageSquare className="size-6 text-ssa-purple" />
              </motion.div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Ask about this document</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  I can explain concepts, answer questions, and help you understand the content
                </p>
              </div>

              {/* Suggestion chips */}
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-ssa-purple/10 text-ssa-purple hover:bg-ssa-purple/20 transition-colors border border-ssa-purple/20"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'flex gap-3',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="size-7 rounded-lg bg-gradient-to-br from-ssa-indigo to-ssa-purple flex items-center justify-center shrink-0 mt-0.5">
                    <Brain className="size-3.5 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2.5',
                    msg.role === 'user'
                      ? 'bg-ssa-purple text-white rounded-br-md'
                      : 'bg-muted/50 border border-border/20 rounded-bl-md'
                  )}
                >
                  {msg.role === 'assistant' ? (
                    <MarkdownContent content={msg.content} />
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 items-start"
            >
              <div className="size-7 rounded-lg bg-gradient-to-br from-ssa-indigo to-ssa-purple flex items-center justify-center shrink-0">
                <Brain className="size-3.5 text-white" />
              </div>
              <div className="bg-muted/50 border border-border/20 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="size-1.5 rounded-full bg-ssa-purple animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="size-1.5 rounded-full bg-ssa-purple animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="size-1.5 rounded-full bg-ssa-purple animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border/30">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about this document..."
              className="min-h-[40px] max-h-[120px] resize-none pr-2 text-sm border-border/40 focus-visible:border-ssa-purple/50 focus-visible:ring-2 focus-visible:ring-ssa-purple focus-visible:ring-offset-2"
              rows={1}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            size="icon"
            className="shrink-0 size-10 bg-gradient-to-r from-ssa-indigo via-ssa-purple to-ssa-cyan text-white hover:opacity-90"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Paste Content Dialog
   ═══════════════════════════════════════════════════════════════════ */

function PasteContentDialog({
  open,
  onClose,
  onSubmit,
  fileName,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (content: string) => void
  fileName: string
}) {
  const [text, setText] = useState('')

  const handleSubmit = () => {
    if (!text.trim()) return
    onSubmit(text.trim())
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="size-5 text-ssa-purple" />
            Paste Document Text
          </DialogTitle>
          <DialogDescription>
            Paste the text content from &quot;{fileName}&quot; so SSA can analyze it. You can copy text from any PDF reader or document.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your document text here...&#10;&#10;Tip: Open the PDF in your browser or a PDF reader, select all text (Ctrl+A), copy (Ctrl+C), and paste it here (Ctrl+V)."
          className="min-h-[200px] max-h-[400px] resize-y text-sm border-border/40 focus-visible:border-ssa-purple/50 focus-visible:ring-2 focus-visible:ring-ssa-purple focus-visible:ring-offset-2"
        />

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="bg-gradient-to-r from-ssa-indigo via-ssa-purple to-ssa-cyan text-white hover:opacity-90"
          >
            <Sparkles className="size-4 mr-2" />
            Analyze with AI
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Main PDF Intelligence Component
   ═══════════════════════════════════════════════════════════════════ */

export default function PdfIntelligence({
  fileName,
  fileContent,
  onClose,
}: PdfIntelligenceProps) {
  const [activeTab, setActiveTab] = useState<TabId>('summary')
  const [content, setContent] = useState(fileContent)
  const [showPasteDialog, setShowPasteDialog] = useState(!fileContent || !fileContent.trim())

  const handlePasteSubmit = useCallback((pastedContent: string) => {
    setContent(pastedContent)
    setShowPasteDialog(false)
  }, [])

  const tabs: { id: TabId; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'summary', label: 'Summary', icon: <BookOpen className="size-3.5" />, color: 'ssa-purple' },
    { id: 'keywords', label: 'Keywords', icon: <Hash className="size-3.5" />, color: 'ssa-cyan' },
    { id: 'flashcards', label: 'Flashcards', icon: <Layers className="size-3.5" />, color: 'ssa-teal' },
    { id: 'quiz', label: 'Quiz', icon: <Zap className="size-3.5" />, color: 'ssa-indigo' },
    { id: 'chat', label: 'Chat', icon: <MessageSquare className="size-3.5" />, color: 'ssa-purple' },
  ]

  const hasContent = content && content.trim().length > 0

  return (
    <>
      <PasteContentDialog
        open={showPasteDialog}
        onClose={() => {
          if (!content?.trim()) {
            onClose()
          } else {
            setShowPasteDialog(false)
          }
        }}
        onSubmit={handlePasteSubmit}
        fileName={fileName}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col h-[calc(100vh-8rem)] w-full overflow-hidden rounded-2xl border border-border/40 bg-background/80 backdrop-blur-sm shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-background/60 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-xl bg-gradient-to-br from-ssa-indigo/20 via-ssa-purple/20 to-ssa-cyan/20 border border-ssa-purple/20 flex items-center justify-center shrink-0">
              <Brain className="size-4 text-ssa-purple" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground truncate">
                PDF Intelligence
              </h2>
              <p className="text-[11px] text-muted-foreground truncate">{fileName}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!hasContent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPasteDialog(true)}
                className="h-7 px-2 text-xs gap-1 text-ssa-purple hover:text-ssa-purple"
              >
                <ClipboardPaste className="size-3" />
                Paste Text
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="size-8 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border/30 bg-background/40 overflow-x-auto scrollbar-thin">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            const colorMap: Record<string, string> = {
              'ssa-purple': 'bg-ssa-purple/10 text-ssa-purple border-ssa-purple/20',
              'ssa-cyan': 'bg-ssa-cyan/10 text-ssa-cyan border-ssa-cyan/20',
              'ssa-teal': 'bg-ssa-teal/10 text-ssa-teal border-ssa-teal/20',
              'ssa-indigo': 'bg-ssa-indigo/10 text-ssa-indigo border-ssa-indigo/20',
            }
            const activeClass = colorMap[tab.color] || colorMap['ssa-purple']

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                disabled={!hasContent}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                  isActive
                    ? `${activeClass} border`
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent',
                  !hasContent && 'opacity-50 cursor-not-allowed'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden min-h-0">
          {!hasContent ? (
            <div className="flex flex-col items-center justify-center gap-4 h-full text-center p-6">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-ssa-indigo/10 via-ssa-purple/10 to-ssa-cyan/10 border border-ssa-purple/20"
              >
                <FileText className="size-7 text-ssa-purple" />
              </motion.div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">No document content</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Paste the text from your document so SSA can analyze it with AI
                </p>
              </div>
              <Button
                onClick={() => setShowPasteDialog(true)}
                className="gap-1.5 bg-gradient-to-r from-ssa-indigo via-ssa-purple to-ssa-cyan text-white hover:opacity-90"
              >
                <ClipboardPaste className="size-4" />
                Paste Document Text
              </Button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === 'summary' && (
                <motion.div
                  key="summary"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="h-full min-h-0"
                >
                  <SummaryTab fileContent={content} fileName={fileName} />
                </motion.div>
              )}

              {activeTab === 'keywords' && (
                <motion.div
                  key="keywords"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="h-full min-h-0"
                >
                  <KeywordsTab fileContent={content} fileName={fileName} />
                </motion.div>
              )}

              {activeTab === 'flashcards' && (
                <motion.div
                  key="flashcards"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="h-full min-h-0"
                >
                  <FlashcardsTab fileContent={content} fileName={fileName} />
                </motion.div>
              )}

              {activeTab === 'quiz' && (
                <motion.div
                  key="quiz"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="h-full min-h-0"
                >
                  <QuizTab fileContent={content} fileName={fileName} />
                </motion.div>
              )}

              {activeTab === 'chat' && (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="h-full min-h-0"
                >
                  <ChatTab fileContent={content} fileName={fileName} />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </>
  )
}

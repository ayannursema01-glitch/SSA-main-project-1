'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Headphones,
  BookOpen,
  Sparkles,
  Trash2,
  Plus,
  Loader2,
  Music,
  Clock,
  FileAudio,
  Radio,
  Wand2,
  Search,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Disc3,
  ListMusic,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  useAppStore,
  type AudioPrimer,
  type AudioChapter,
} from '@/store/use-app-store'
import { AIConfigNotice } from '@/components/ssa/ai-config-notice'

/* ═══════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════ */

const VOICE_OPTIONS = [
  { id: 'Kore', label: 'Kore', description: 'Firm & Clear' },
  { id: 'Charon', label: 'Charon', description: 'Informative' },
  { id: 'Puck', label: 'Puck', description: 'Upbeat' },
  { id: 'Aoede', label: 'Aoede', description: 'Easy-going' },
  { id: 'Zephyr', label: 'Zephyr', description: 'Bright' },
  { id: 'Enceladus', label: 'Enceladus', description: 'Breathy' },
  { id: 'Sulafat', label: 'Sulafat', description: 'Warm' },
  { id: 'Orus', label: 'Orus', description: 'Firm' },
] as const

const SPEED_OPTIONS = [
  { value: '0.75', label: '0.75x' },
  { value: '1.0', label: '1.0x' },
  { value: '1.25', label: '1.25x' },
  { value: '1.5', label: '1.5x' },
] as const

const SUBJECT_SUGGESTIONS = [
  'Biology',
  'Mathematics',
  'Physics',
  'Chemistry',
  'History',
  'Literature',
  'Computer Science',
  'Economics',
  'Psychology',
  'Philosophy',
  'Art History',
  'Sociology',
]

const SUBJECT_COLORS: Record<string, string> = {
  Biology: 'from-emerald-500 to-teal-500',
  Mathematics: 'from-ssa-indigo to-ssa-purple',
  Physics: 'from-ssa-cyan to-ssa-blue',
  Chemistry: 'from-amber-500 to-orange-500',
  History: 'from-rose-500 to-pink-500',
  Literature: 'from-violet-500 to-purple-500',
  'Computer Science': 'from-sky-500 to-blue-500',
  Economics: 'from-green-500 to-emerald-500',
  Psychology: 'from-pink-500 to-rose-500',
  Philosophy: 'from-indigo-500 to-violet-500',
  'Art History': 'from-fuchsia-500 to-pink-500',
  Sociology: 'from-teal-500 to-cyan-500',
}

const SUBJECT_ICONS: Record<string, string> = {
  Biology: '🧬',
  Mathematics: '📐',
  Physics: '⚛️',
  Chemistry: '🧪',
  History: '📜',
  Literature: '📖',
  'Computer Science': '💻',
  Economics: '📊',
  Psychology: '🧠',
  Philosophy: '🤔',
  'Art History': '🎨',
  Sociology: '👥',
}

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */

function splitTextIntoChunks(text: string, maxLength = 1000): string[] {
  const chunks: string[] = []
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  let currentChunk = ''
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxLength) {
      currentChunk += sentence
    } else {
      if (currentChunk) chunks.push(currentChunk.trim())
      currentChunk = sentence
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim())
  return chunks
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds === 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getSubjectColor(subject: string): string {
  return SUBJECT_COLORS[subject] || 'from-ssa-purple to-ssa-cyan'
}

function getSubjectIcon(subject: string): string {
  return SUBJECT_ICONS[subject] || '📚'
}

function generateId(): string {
  return `primer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/* ═══════════════════════════════════════════════════════════════════
   Sub-Components
   ═══════════════════════════════════════════════════════════════════ */

/* ─── Waveform Visualization ─── */
function WaveformVisualizer({ isPlaying, barCount = 32 }: { isPlaying: boolean; barCount?: number }) {
  return (
    <div className="flex items-center justify-center gap-[2px] h-10 w-full" aria-label="Audio waveform visualization">
      {Array.from({ length: barCount }).map((_, i) => {
        const baseHeight = 15 + Math.sin(i * 0.5) * 20 + Math.cos(i * 0.3) * 15
        return (
          <motion.div
            key={i}
            className="w-[3px] rounded-full bg-gradient-to-t from-ssa-purple to-ssa-cyan"
            animate={
              isPlaying
                ? {
                    height: [
                      `${baseHeight}%`,
                      `${20 + Math.random() * 70}%`,
                      `${baseHeight * 0.6}%`,
                      `${30 + Math.random() * 50}%`,
                      `${baseHeight}%`,
                    ],
                  }
                : { height: `${baseHeight * 0.3}%` }
            }
            transition={
              isPlaying
                ? {
                    duration: 1.0 + (i % 5) * 0.15,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: (i % 8) * 0.05,
                  }
                : { duration: 0.5, ease: 'easeOut' }
            }
          />
        )
      })}
    </div>
  )
}

/* ─── Album Art Cover ─── */
function AlbumCover({ subject, title, isPlaying }: { subject: string; title: string; isPlaying: boolean }) {
  const gradientClass = getSubjectColor(subject)
  const icon = getSubjectIcon(subject)

  return (
    <motion.div
      className={`relative w-full aspect-square max-w-[280px] rounded-2xl bg-gradient-to-br ${gradientClass} flex items-center justify-center overflow-hidden shadow-xl`}
      animate={isPlaying ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      transition={isPlaying ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }} />
      </div>

      {/* Spinning disc effect */}
      {isPlaying && (
        <motion.div
          className="absolute inset-4 rounded-full border-2 border-white/20"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/30" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white/40" />
        </motion.div>
      )}

      {/* Subject icon */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-3"
        animate={isPlaying ? { y: [0, -4, 0] } : {}}
        transition={isPlaying ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : {}}
      >
        <span className="text-5xl sm:text-6xl drop-shadow-lg">{icon}</span>
        <div className="text-center px-4">
          <p className="text-white font-bold text-sm sm:text-base truncate max-w-[200px] drop-shadow-md">
            {title}
          </p>
          <p className="text-white/70 text-xs mt-1">{subject}</p>
        </div>
      </motion.div>

      {/* Ambient glow */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        animate={isPlaying ? { opacity: [0, 0.3, 0] } : { opacity: 0 }}
        transition={isPlaying ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
        style={{
          background: 'radial-gradient(circle at center, rgba(255,255,255,0.2), transparent 70%)',
        }}
      />
    </motion.div>
  )
}

/* ─── Audio Player ─── */
function AudioPlayer({
  primer,
  onClose,
}: {
  primer: AudioPrimer
  onClose: () => void
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(primer.duration || 0)
  const [volume, setVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(primer.speed || 1.0)
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Derive audio URLs from primer data (no effect needed)
  const audioUrls = useMemo(() => {
    const urls: string[] = []
    for (const chapter of primer.chapters) {
      if (chapter.audioUrl) {
        urls.push(chapter.audioUrl)
      }
    }
    if (primer.audioUrl && urls.length === 0) {
      urls.push(primer.audioUrl)
    }
    return urls
  }, [primer.chapters, primer.audioUrl])

  // Initialize audio
  useEffect(() => {
    if (audioUrls.length === 0) return

    const audio = new Audio()
    audioRef.current = audio
    audio.preload = 'metadata'

    const currentUrl = audioUrls[currentChapterIndex]
    if (currentUrl) {
      audio.src = currentUrl
    }

    audio.volume = isMuted ? 0 : volume
    audio.playbackRate = playbackSpeed

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }
    const handleEnded = () => {
      // Move to next chapter or finish
      if (currentChapterIndex < audioUrls.length - 1) {
        setCurrentChapterIndex((prev) => prev + 1)
      } else {
        setIsPlaying(false)
        setCurrentTime(0)
        setCurrentChapterIndex(0)
      }
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.pause()
      audio.src = ''
    }
  }, [audioUrls, currentChapterIndex])

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  // Update playback speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

  // Progress tracking interval
  useEffect(() => {
    if (isPlaying) {
      progressRef.current = setInterval(() => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime)
        }
      }, 250)
    } else if (progressRef.current) {
      clearInterval(progressRef.current)
    }
    return () => {
      if (progressRef.current) clearInterval(progressRef.current)
    }
  }, [isPlaying])

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().catch(() => {
        // Autoplay blocked
      })
      setIsPlaying(true)
    }
  }, [isPlaying])

  const handleSeek = useCallback((value: number[]) => {
    if (!audioRef.current) return
    const seekTime = (value[0] / 100) * (audioRef.current.duration || 0)
    audioRef.current.currentTime = seekTime
    setCurrentTime(seekTime)
  }, [])

  const handleSkip = useCallback((seconds: number) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.currentTime + seconds, audioRef.current.duration || 0))
  }, [])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev)
  }, [])

  const cycleSpeed = useCallback(() => {
    const speeds = [0.75, 1.0, 1.25, 1.5]
    const currentIndex = speeds.indexOf(playbackSpeed)
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length]
    setPlaybackSpeed(nextSpeed)
  }, [playbackSpeed])

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  // Estimate total duration from chapters
  const totalDuration = useMemo(() => {
    if (duration > 0) return duration
    return primer.duration || 0
  }, [duration, primer.duration])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="glass-card overflow-hidden border-border/30">
        <CardContent className="p-4 sm:p-6">
          {/* Close / Back button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Headphones className="size-5 text-ssa-purple" />
              <span className="text-sm font-semibold text-foreground">Now Playing</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
            >
              Close Player
            </Button>
          </div>

          {/* Album Art + Info */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-6">
            <AlbumCover subject={primer.subject} title={primer.title} isPlaying={isPlaying} />
            <div className="flex-1 text-center sm:text-left min-w-0">
              <h3 className="text-lg font-bold text-foreground truncate">{primer.title}</h3>
              <div className="flex items-center gap-2 justify-center sm:justify-start mt-1">
                <Badge
                  className={`bg-gradient-to-r ${getSubjectColor(primer.subject)} text-white border-0 text-[10px]`}
                >
                  {primer.subject}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {VOICE_OPTIONS.find((v) => v.id === primer.voice)?.label || primer.voice}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">{formatDuration(totalDuration)}</span>
              </div>

              {/* Waveform */}
              <div className="mt-4">
                <WaveformVisualizer isPlaying={isPlaying} />
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-3">
            <Slider
              value={[progressPercent]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              aria-label="Playback progress"
              className="cursor-pointer"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[11px] text-muted-foreground tabular-nums">{formatDuration(currentTime)}</span>
              <span className="text-[11px] text-muted-foreground tabular-nums">{formatDuration(totalDuration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            {/* Speed toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cycleSpeed}
                  className="h-8 px-2 text-xs border-border/40 hover:border-ssa-purple/40 hover:bg-ssa-purple/5 min-w-[52px]"
                >
                  {playbackSpeed}x
                </Button>
              </TooltipTrigger>
              <TooltipContent>Playback speed</TooltipContent>
            </Tooltip>

            {/* Skip back 15s */}
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleSkip(-15)}
                className="size-10 text-muted-foreground hover:text-foreground"
                aria-label="Skip back 15 seconds"
              >
                <SkipBack className="size-4" />
                <span className="absolute text-[8px] font-bold mt-0.5">15</span>
              </Button>
            </motion.div>

            {/* Play/Pause */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handlePlayPause}
                className="size-14 rounded-full bg-gradient-to-r from-ssa-indigo via-ssa-purple to-ssa-cyan hover:opacity-90 shadow-lg shadow-ssa-purple/25 text-white"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="size-6" />
                ) : (
                  <Play className="size-6 ml-0.5" />
                )}
              </Button>
            </motion.div>

            {/* Skip forward 15s */}
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleSkip(15)}
                className="size-10 text-muted-foreground hover:text-foreground"
                aria-label="Skip forward 15 seconds"
              >
                <SkipForward className="size-4" />
                <span className="absolute text-[8px] font-bold mt-0.5">15</span>
              </Button>
            </motion.div>

            {/* Volume */}
            <div className="flex items-center gap-1.5">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleMute}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ssa-purple"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="size-4" />
                ) : (
                  <Volume2 className="size-4" />
                )}
              </motion.button>
              <div className="hidden sm:block w-20">
                <Slider
                  value={[isMuted ? 0 : volume * 100]}
                  onValueChange={([v]) => {
                    setVolume(v / 100)
                    if (v > 0) setIsMuted(false)
                  }}
                  max={100}
                  step={1}
                  aria-label="Volume"
                  className="cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Chapter List */}
          {primer.chapters.length > 1 && (
            <div className="mt-6 pt-4 border-t border-border/30">
              <div className="flex items-center gap-2 mb-3">
                <ListMusic className="size-4 text-ssa-purple" />
                <span className="text-sm font-semibold text-foreground">Chapters</span>
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  {primer.chapters.length}
                </Badge>
              </div>
              <ScrollArea className="max-h-48">
                <div className="space-y-1">
                  {primer.chapters.map((chapter, idx) => (
                    <button
                      key={chapter.id}
                      onClick={() => {
                        setCurrentChapterIndex(idx)
                        if (audioRef.current && audioUrls[idx]) {
                          audioRef.current.src = audioUrls[idx]
                          audioRef.current.play().catch(() => {})
                          setIsPlaying(true)
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all text-sm outline-none focus-visible:ring-2 focus-visible:ring-ssa-purple ${
                        idx === currentChapterIndex
                          ? 'bg-ssa-purple/10 border border-ssa-purple/20'
                          : 'hover:bg-muted/50 border border-transparent'
                      }`}
                    >
                      <div
                        className={`flex items-center justify-center size-7 rounded-full shrink-0 ${
                          idx === currentChapterIndex
                            ? 'bg-gradient-to-r from-ssa-indigo to-ssa-purple text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {idx === currentChapterIndex && isPlaying ? (
                          <Disc3 className="size-3.5 animate-spin" />
                        ) : (
                          <span className="text-[10px] font-bold">{idx + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`truncate text-xs font-medium ${
                          idx === currentChapterIndex ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {chapter.title}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDuration(chapter.duration)}
                      </span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ─── Primer Creator ─── */
function PrimerCreator({ onGenerated }: { onGenerated: (primer: AudioPrimer) => void }) {
  const {
    isPrimerGenerating,
    setIsPrimerGenerating,
    addAudioPrimer,
    updateAudioPrimer,
  } = useAppStore()

  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [voice, setVoice] = useState('Kore')
  const [speed, setSpeed] = useState('1.0')
  const [showSubjectSuggestions, setShowSubjectSuggestions] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationStatus, setGenerationStatus] = useState('')
  const [failedChunks, setFailedChunks] = useState(0)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const subjectInputRef = useRef<HTMLInputElement>(null)

  // AI Enhancement state
  const [enhanceWithAI, setEnhanceWithAI] = useState(true)
  const [enhancedText, setEnhancedText] = useState<string | null>(null)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [showEnhancedPreview, setShowEnhancedPreview] = useState(false)

  // Chapter preview — use enhanced text if available, otherwise source text
  const activeText = enhancedText ?? sourceText

  const chapterPreview = useMemo(() => {
    if (!activeText.trim()) return []
    return splitTextIntoChunks(activeText)
  }, [activeText])

  const canGenerate = title.trim() && subject.trim() && sourceText.trim() && !isPrimerGenerating

  // Clear enhanced text when source changes
  useEffect(() => {
    setEnhancedText(null)
  }, [sourceText])

  // Handle AI text enhancement preview
  const handleEnhanceText = useCallback(async () => {
    if (!sourceText.trim() || !subject.trim()) {
      toast.error('Please enter study material and a subject first', {
        description: 'Both the text and subject are needed to enhance with AI.',
      })
      return
    }

    setIsEnhancing(true)
    try {
      const response = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sourceText,
          voice,
          speed: parseFloat(speed),
          chunkIndex: 0,
          enhance: true,
          subject: subject.trim(),
          previewOnly: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Enhancement failed: ${response.status}`)
      }

      // The TTS route will enhance the text and return audio.
      // We need a dedicated way to get just the enhanced text.
      // Since the TTS route enhances server-side, we use the chat API directly.
      const chatResponse = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are SSA Podcast Script Writer. You transform study material into engaging, conversational audio scripts perfect for a study podcast.

RULES:
- Transform the raw study material into a natural, conversational audio script
- Use a warm, friendly, and educational tone — like a knowledgeable study buddy talking to the listener
- Start with a brief introduction: "Hey there! Today we're diving into [topic]..."
- Break down complex concepts into simple, digestible explanations
- Use phrases like "Think of it this way...", "Here's the key point...", "Now this is really important..."
- Add natural transitions between sections: "Moving on to...", "Now let's look at...", "Here's where it gets interesting..."
- Include a quick recap at the end: "So to summarize what we've covered..."
- Keep sentences relatively short and easy to follow by ear
- Avoid bullet points, numbered lists, or visual formatting — everything should be spoken-word friendly
- Do NOT use markdown, special characters, or symbols
- Write as one continuous narrative that flows naturally
- Keep the total length similar to the original text (don't expand or shrink significantly)
- If the text is already conversational and well-suited for audio, just improve the flow slightly`,
            },
            {
              role: 'user',
              content: `Transform this study material about ${subject} into an engaging podcast-style audio script:\n\n${sourceText.slice(0, 8000)}`,
            },
          ],
        }),
      })

      if (!chatResponse.ok) {
        throw new Error('Failed to enhance text with AI')
      }

      const data = await chatResponse.json()
      const enhanced = data.content?.trim() || data.message?.trim() || (typeof data === 'string' ? data.trim() : '')

      if (enhanced && enhanced.length > sourceText.length * 0.3) {
        setEnhancedText(enhanced)
        setShowEnhancedPreview(true)
        toast.success('Text enhanced with AI!', {
          description: 'Review the enhanced podcast script below.',
        })
      } else {
        toast.warning('AI enhancement returned insufficient content', {
          description: 'The original text will be used instead.',
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error enhancing text:', error)
      toast.error('Failed to enhance text', {
        description: message,
      })
    } finally {
      setIsEnhancing(false)
    }
  }, [sourceText, subject, voice, speed])

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return

    const textToUse = enhancedText ?? sourceText
    const chunks = splitTextIntoChunks(textToUse)
    const primerId = generateId()

    const chapters: AudioChapter[] = chunks.map((chunk, idx) => ({
      id: `${primerId}-ch-${idx}`,
      title: `Chapter ${idx + 1}: ${chunk.slice(0, 50).trim()}${chunk.length > 50 ? '...' : ''}`,
      text: chunk,
      audioUrl: null,
      duration: 0,
      order: idx,
    }))

    const newPrimer: AudioPrimer = {
      id: primerId,
      title: title.trim(),
      subject: subject.trim(),
      sourceText: sourceText.trim(),
      audioUrl: null,
      duration: 0,
      voice,
      speed: parseFloat(speed),
      status: 'generating',
      createdAt: Date.now(),
      chapters,
    }

    addAudioPrimer(newPrimer)
    setIsPrimerGenerating(true)
    setGenerationProgress(0)
    setGenerationStatus('Preparing text...')
    setFailedChunks(0)
    setGenerationError(null)

    try {
      const audioBlobs: Blob[] = []
      let totalDuration = 0
      let chunkFailures = 0

      for (let i = 0; i < chunks.length; i++) {
        setGenerationStatus(`Generating audio ${i + 1} of ${chunks.length}...${chunkFailures > 0 ? ` (${chunkFailures} failed)` : ''}`)
        setGenerationProgress(((i) / chunks.length) * 100)

        try {
          const response = await fetch('/api/ai/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: chunks[i],
              voice,
              speed: parseFloat(speed),
              chunkIndex: i,
              enhance: enhanceWithAI,
              subject: subject.trim(),
            }),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `TTS API error: ${response.status}`)
          }

          const contentType = response.headers.get('content-type') || ''
          let audioUrl: string
          let estimatedDuration: number

          if (contentType.includes('audio') || contentType.includes('octet-stream')) {
            const blob = await response.blob()
            audioBlobs.push(blob)
            audioUrl = URL.createObjectURL(blob)
            // Estimate duration based on text length and speed
            estimatedDuration = (chunks[i].length / 15) / parseFloat(speed)
          } else {
            // JSON response with audio data
            const data = await response.json()
            if (data.audioUrl) {
              audioUrl = data.audioUrl
            } else if (data.audio) {
              const binaryString = atob(data.audio)
              const bytes = new Uint8Array(binaryString.length)
              for (let j = 0; j < binaryString.length; j++) {
                bytes[j] = binaryString.charCodeAt(j)
              }
              const blob = new Blob([bytes], { type: 'audio/mpeg' })
              audioBlobs.push(blob)
              audioUrl = URL.createObjectURL(blob)
            } else {
              audioUrl = ''
            }
            estimatedDuration = data.duration || (chunks[i].length / 15) / parseFloat(speed)
          }

          // Update chapter with audio URL
          const updatedChapters = [...chapters]
          updatedChapters[i] = {
            ...updatedChapters[i],
            audioUrl,
            duration: estimatedDuration,
          }
          totalDuration += estimatedDuration

          updateAudioPrimer(primerId, {
            chapters: updatedChapters,
            duration: totalDuration,
          })
        } catch (chunkError) {
          const errorMsg = chunkError instanceof Error ? chunkError.message : 'Unknown error'
          console.error(`Error generating chunk ${i}:`, chunkError)
          toast.error(`Chunk ${i + 1} failed to generate`, {
            description: errorMsg,
          })
          chunkFailures++
          setFailedChunks(chunkFailures)
          // Continue with remaining chunks
        }
      }

      // Create a combined audio URL if multiple blobs
      let combinedAudioUrl: string | null = null
      if (audioBlobs.length > 0) {
        if (audioBlobs.length === 1) {
          combinedAudioUrl = URL.createObjectURL(audioBlobs[0])
        } else {
          // For multiple chunks, use the first chunk's URL
          // Sequential playback will be handled by the player
          combinedAudioUrl = URL.createObjectURL(audioBlobs[0])
        }
      }

      setGenerationProgress(100)
      setGenerationStatus('Finalizing...')

      // Determine final status based on failures
      if (chunkFailures === chunks.length) {
        // All chunks failed
        updateAudioPrimer(primerId, { status: 'error' })
        setGenerationError('All audio chunks failed to generate. Please try again.')
        toast.error('Failed to generate audio', {
          description: 'All chunks failed. Check your API configuration and try again.',
        })
      } else if (chunkFailures > 0) {
        // Some chunks succeeded, some failed
        updateAudioPrimer(primerId, {
          status: 'ready',
          audioUrl: combinedAudioUrl,
        })
        toast.warning('Some chunks failed to generate', {
          description: `${chunkFailures} of ${chunks.length} chunk(s) failed. The primer is partially available.`,
        })

        // Get the final primer from store
        const finalPrimer = useAppStore.getState().audioPrimers.find((p) => p.id === primerId)
        if (finalPrimer) {
          onGenerated(finalPrimer)
        }
      } else {
        // All succeeded
        updateAudioPrimer(primerId, {
          status: 'ready',
          audioUrl: combinedAudioUrl,
        })
        toast.success('Audio primer generated successfully!', {
          description: `${chunks.length} chapter${chunks.length !== 1 ? 's' : ''} ready to play.`,
        })

        // Get the final primer from store
        const finalPrimer = useAppStore.getState().audioPrimers.find((p) => p.id === primerId)
        if (finalPrimer) {
          onGenerated(finalPrimer)
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred'
      console.error('Error generating audio primer:', error)
      updateAudioPrimer(primerId, { status: 'error' })
      setGenerationError(message)
      toast.error('Failed to generate audio', {
        description: message,
      })
    } finally {
      setIsPrimerGenerating(false)
      setGenerationProgress(0)
      setGenerationStatus('')
    }
  }, [canGenerate, title, subject, sourceText, enhancedText, voice, speed, enhanceWithAI, addAudioPrimer, updateAudioPrimer, setIsPrimerGenerating, onGenerated])

  // Reset error state for retry
  const handleRetry = useCallback(() => {
    setGenerationError(null)
    setFailedChunks(0)
  }, [])

  return (
    <Card className="glass-card overflow-hidden border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-ssa-indigo to-ssa-purple text-white">
            <Wand2 className="size-4" />
          </div>
          Create Audio Primer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="primer-title">
            Title
          </label>
          <Input
            id="primer-title"
            placeholder="e.g., Cell Division Overview"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-muted/30 border-border/40 focus:border-ssa-purple/40 transition-colors"
            disabled={isPrimerGenerating}
          />
        </div>

        {/* Subject */}
        <div className="space-y-1.5 relative">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="primer-subject">
            Subject
          </label>
          <Input
            id="primer-subject"
            ref={subjectInputRef}
            placeholder="e.g., Biology"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value)
              setShowSubjectSuggestions(true)
            }}
            onFocus={() => setShowSubjectSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSubjectSuggestions(false), 200)}
            className="bg-muted/30 border-border/40 focus:border-ssa-purple/40 transition-colors"
            disabled={isPrimerGenerating}
          />
          {/* Subject suggestions */}
          <AnimatePresence>
            {showSubjectSuggestions && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border/50 rounded-lg shadow-lg overflow-hidden"
              >
                <ScrollArea className="max-h-40">
                  <div className="p-1">
                    {SUBJECT_SUGGESTIONS
                      .filter((s) => s.toLowerCase().includes(subject.toLowerCase()))
                      .map((suggestion) => (
                        <button
                          key={suggestion}
                          onMouseDown={() => {
                            setSubject(suggestion)
                            setShowSubjectSuggestions(false)
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-accent/60 transition-colors flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ssa-purple"
                        >
                          <span className="text-xs">{getSubjectIcon(suggestion)}</span>
                          <span>{suggestion}</span>
                        </button>
                      ))}
                  </div>
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Source Text */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="primer-text">
              Study Material
            </label>
            <span className="text-[10px] text-muted-foreground">
              {sourceText.length} chars • {chapterPreview.length} chapter{chapterPreview.length !== 1 ? 's' : ''}
            </span>
          </div>
          <Textarea
            id="primer-text"
            placeholder="Paste your study material here... The text will be automatically split into chapters for audio generation."
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            className="min-h-[160px] bg-muted/30 border-border/40 focus:border-ssa-purple/40 transition-colors resize-y text-sm"
            disabled={isPrimerGenerating}
          />
        </div>

        {/* AI Enhancement Toggle & Preview */}
        <div className="space-y-3 rounded-lg border border-border/30 bg-muted/20 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-ssa-purple" />
              <div>
                <span className="text-xs font-medium text-foreground">Enhance with AI</span>
                <p className="text-[10px] text-muted-foreground">Transform notes into a conversational podcast script</p>
              </div>
            </div>
            <Switch
              checked={enhanceWithAI}
              onCheckedChange={setEnhanceWithAI}
              disabled={isPrimerGenerating || isEnhancing}
              aria-label="Toggle AI text enhancement"
            />
          </div>

          {/* Enhance Text Preview Button */}
          {enhanceWithAI && sourceText.trim() && subject.trim() && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnhanceText}
                disabled={isEnhancing || isPrimerGenerating}
                className="h-7 text-xs border-ssa-purple/30 hover:border-ssa-purple/50 hover:bg-ssa-purple/5 text-ssa-purple"
              >
                {isEnhancing ? (
                  <>
                    <Loader2 className="size-3 mr-1.5 animate-spin" />
                    Enhancing...
                  </>
                ) : enhancedText ? (
                  <>
                    <RefreshCw className="size-3 mr-1.5" />
                    Re-enhance Text
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3 mr-1.5" />
                    Preview Enhanced Text
                  </>
                )}
              </Button>

              {enhancedText && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEnhancedText(null)
                    setShowEnhancedPreview(false)
                  }}
                  disabled={isPrimerGenerating}
                  className="h-7 text-xs text-muted-foreground hover:text-destructive"
                >
                  Clear Enhancement
                </Button>
              )}
            </div>
          )}

          {/* Enhanced Text Preview (Collapsible) */}
          {enhancedText && (
            <Collapsible open={showEnhancedPreview} onOpenChange={setShowEnhancedPreview}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1.5 text-[10px] text-ssa-purple hover:text-ssa-indigo transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ssa-purple rounded">
                  {showEnhancedPreview ? (
                    <>
                      <EyeOff className="size-3" />
                      Hide enhanced script
                    </>
                  ) : (
                    <>
                      <Eye className="size-3" />
                      Show enhanced script
                    </>
                  )}
                  <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-1">
                    {enhancedText.length} chars
                  </Badge>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-2">
                  {/* Toggle between original and enhanced */}
                  <div className="flex items-center gap-2 text-[10px]">
                    <button
                      className={`px-2 py-0.5 rounded-full font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ssa-purple ${
                        !showEnhancedPreview || enhancedText
                          ? 'bg-ssa-purple/15 text-ssa-purple border border-ssa-purple/25'
                          : 'bg-muted/50 text-muted-foreground border border-transparent'
                      }`}
                    >
                      Enhanced
                    </button>
                    <span className="text-muted-foreground">vs</span>
                    <button
                      onClick={() => {
                        setEnhancedText(null)
                        setShowEnhancedPreview(false)
                      }}
                      className="px-2 py-0.5 rounded-full font-medium bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ssa-purple"
                    >
                      Original
                    </button>
                  </div>
                  <ScrollArea className="max-h-40">
                    <div className="rounded-md bg-background/50 border border-ssa-purple/10 p-2.5 text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
                      {enhancedText}
                    </div>
                  </ScrollArea>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        {/* Voice & Speed */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Voice</label>
            <Select value={voice} onValueChange={setVoice} disabled={isPrimerGenerating}>
              <SelectTrigger className="w-full bg-muted/30 border-border/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOICE_OPTIONS.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    <span className="flex items-center gap-1.5">
                      <Mic className="size-3" />
                      {v.label} <span className="text-muted-foreground text-xs">({v.description})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Speed</label>
            <Select value={speed} onValueChange={setSpeed} disabled={isPrimerGenerating}>
              <SelectTrigger className="w-full bg-muted/30 border-border/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPEED_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Chapter Preview */}
        {chapterPreview.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="size-3.5 text-ssa-purple" />
              <span className="text-xs font-medium text-muted-foreground">Chapter Preview</span>
              {enhancedText && (
                <Badge className="bg-ssa-purple/10 text-ssa-purple border-ssa-purple/20 text-[9px] h-4 px-1.5">
                  AI Enhanced
                </Badge>
              )}
            </div>
            <ScrollArea className="max-h-32">
              <div className="space-y-1">
                {chapterPreview.map((chunk, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 px-2.5 py-1.5 rounded-md bg-muted/30 text-xs text-muted-foreground"
                  >
                    <Badge variant="outline" className="shrink-0 h-5 px-1.5 text-[9px] border-ssa-purple/30 text-ssa-purple">
                      {idx + 1}
                    </Badge>
                    <span className="line-clamp-2">{chunk.slice(0, 100)}{chunk.length > 100 ? '...' : ''}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </motion.div>
        )}

        {/* Generation Progress */}
        <AnimatePresence>
          {isPrimerGenerating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 text-ssa-purple animate-spin" />
                  <span className="text-sm text-foreground font-medium">{generationStatus}</span>
                </div>
                {failedChunks > 0 && (
                  <Badge variant="destructive" className="text-[9px] h-5 px-1.5">
                    {failedChunks} failed
                  </Badge>
                )}
              </div>
              <Progress value={generationProgress} className="h-2" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generation Error with Retry */}
        {generationError && !isPrimerGenerating && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-destructive">Generation Failed</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{generationError}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="w-full h-8 text-xs border-destructive/30 hover:border-destructive/50 hover:bg-destructive/5 text-destructive"
            >
              <RefreshCw className="size-3 mr-1.5" />
              Try Again
            </Button>
          </motion.div>
        )}

        {/* Generate Button */}
        <motion.div whileHover={{ scale: canGenerate ? 1.01 : 1 }} whileTap={{ scale: canGenerate ? 0.99 : 1 }}>
          <Button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full h-11 bg-gradient-to-r from-ssa-indigo via-ssa-purple to-ssa-cyan hover:opacity-90 text-white font-semibold shadow-lg shadow-ssa-purple/20 disabled:opacity-50 disabled:shadow-none transition-all"
          >
            {isPrimerGenerating ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Generating Audio Primer...
              </>
            ) : (
              <>
                <Sparkles className="size-4 mr-2" />
                {enhanceWithAI ? 'Generate AI-Enhanced Primer' : 'Generate Audio Primer'}
              </>
            )}
          </Button>
        </motion.div>
      </CardContent>
    </Card>
  )
}

/* ─── Primer Library Item ─── */
function PrimerLibraryItem({
  primer,
  isActive,
  onPlay,
  onDelete,
}: {
  primer: AudioPrimer
  isActive: boolean
  onPlay: () => void
  onDelete: () => void
}) {
  const statusConfig = {
    draft: { icon: FileAudio, label: 'Draft', color: 'text-muted-foreground', bg: 'bg-muted/50' },
    generating: { icon: Loader2, label: 'Generating', color: 'text-ssa-purple', bg: 'bg-ssa-purple/10' },
    ready: { icon: CheckCircle2, label: 'Ready', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    error: { icon: AlertCircle, label: 'Error', color: 'text-destructive', bg: 'bg-destructive/10' },
  }

  const status = statusConfig[primer.status]
  const StatusIcon = status.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className={`group relative flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ssa-purple ${
          isActive
            ? 'border-ssa-purple/40 bg-ssa-purple/5 shadow-sm shadow-ssa-purple/10'
            : 'border-border/30 bg-card/60 hover:border-ssa-purple/20 hover:bg-ssa-purple/3'
        }`}
        onClick={onPlay}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onPlay() }}
      >
        {/* Subject icon mini-cover */}
        <div className={`flex items-center justify-center size-10 rounded-lg bg-gradient-to-br ${getSubjectColor(primer.subject)} text-white shrink-0 shadow-sm`}>
          <span className="text-base">{getSubjectIcon(primer.subject)}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-foreground truncate">{primer.title}</h4>
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ${status.bg} shrink-0`}>
              <StatusIcon className={`size-3 ${status.color} ${primer.status === 'generating' ? 'animate-spin' : ''}`} />
              <span className={`text-[10px] font-medium ${status.color}`}>{status.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge
              className={`bg-gradient-to-r ${getSubjectColor(primer.subject)} text-white border-0 text-[9px] h-4 px-1.5`}
            >
              {primer.subject}
            </Badge>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="size-2.5" />
              {formatDuration(primer.duration)}
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Mic className="size-2.5" />
              {VOICE_OPTIONS.find((v) => v.id === primer.voice)?.label || primer.voice}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-muted-foreground">
              {formatDate(primer.createdAt)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {primer.chapters.length} chapter{primer.chapters.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 shrink-0">
          {primer.status === 'ready' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-ssa-purple hover:bg-ssa-purple/10"
                  onClick={(e) => { e.stopPropagation(); onPlay() }}
                  aria-label="Play primer"
                >
                  <Play className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Play</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                aria-label="Delete primer"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Empty State ─── */
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      <div className="flex items-center justify-center size-20 rounded-2xl bg-gradient-to-br from-ssa-indigo/10 via-ssa-purple/10 to-ssa-cyan/10 mb-4">
        <Radio className="size-10 text-ssa-purple animate-subtle-pulse" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-1">No Audio Primers Yet</h3>
      <p className="text-sm text-muted-foreground max-w-[260px] leading-relaxed">
        Convert your study material into high-quality audio podcasts with natural voices using TTS.
      </p>
      <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
        <Music className="size-3.5 text-ssa-purple" />
        <span>Create your first primer to get started</span>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */

function SSAStudio() {
  const {
    audioPrimers,
    activePrimerId,
    setActivePrimerId,
    deleteAudioPrimer,
  } = useAppStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [view, setView] = useState<'library' | 'creator' | 'player'>('creator')

  // Get the active primer
  const activePrimer = useMemo(
    () => audioPrimers.find((p) => p.id === activePrimerId) || null,
    [audioPrimers, activePrimerId]
  )

  // Filter primers by search
  const filteredPrimers = useMemo(() => {
    if (!searchQuery.trim()) return audioPrimers
    const q = searchQuery.toLowerCase()
    return audioPrimers.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.subject.toLowerCase().includes(q)
    )
  }, [audioPrimers, searchQuery])

  // Subject filter counts
  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of audioPrimers) {
      counts[p.subject] = (counts[p.subject] || 0) + 1
    }
    return counts
  }, [audioPrimers])

  const [subjectFilter, setSubjectFilter] = useState<string>('all')

  const displayPrimers = useMemo(() => {
    let primers = filteredPrimers
    if (subjectFilter !== 'all') {
      primers = primers.filter((p) => p.subject === subjectFilter)
    }
    return primers
  }, [filteredPrimers, subjectFilter])

  const handlePlayPrimer = useCallback(
    (primer: AudioPrimer) => {
      setActivePrimerId(primer.id)
      setView('player')
    },
    [setActivePrimerId]
  )

  const handleDeletePrimer = useCallback(
    (id: string) => {
      deleteAudioPrimer(id)
      setDeleteConfirmId(null)
      if (activePrimerId === id) {
        setActivePrimerId(null)
        setView('creator')
      }
    },
    [deleteAudioPrimer, activePrimerId, setActivePrimerId]
  )

  const handleGenerated = useCallback(
    (primer: AudioPrimer) => {
      setActivePrimerId(primer.id)
      setView('player')
    },
    [setActivePrimerId]
  )

  const handleClosePlayer = useCallback(() => {
    setActivePrimerId(null)
    setView('creator')
  }, [setActivePrimerId])

  return (
    <div className="w-full min-h-full">
      {/* AI Configuration Notice */}
      <AIConfigNotice />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-ssa-indigo via-ssa-purple to-ssa-cyan text-white shadow-lg shadow-ssa-purple/20">
            <Headphones className="size-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold ssa-gradient-text">SSA Studio</h1>
            <p className="text-xs text-muted-foreground">Audio Primers — Study with your ears</p>
          </div>
        </div>
      </div>

      {/* Mobile view toggle */}
      <div className="flex lg:hidden gap-2 mb-4">
        <Button
          variant={view === 'library' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('library')}
          className={`flex-1 ${view === 'library' ? 'bg-gradient-to-r from-ssa-indigo to-ssa-purple text-white' : 'border-border/40'}`}
        >
          <Radio className="size-3.5 mr-1.5" />
          Library ({audioPrimers.length})
        </Button>
        <Button
          variant={view === 'creator' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('creator')}
          className={`flex-1 ${view === 'creator' ? 'bg-gradient-to-r from-ssa-indigo to-ssa-purple text-white' : 'border-border/40'}`}
        >
          <Plus className="size-3.5 mr-1.5" />
          Create
        </Button>
        {activePrimer && (
          <Button
            variant={view === 'player' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('player')}
            className={`flex-1 ${view === 'player' ? 'bg-gradient-to-r from-ssa-indigo to-ssa-purple text-white' : 'border-border/40'}`}
          >
            <Play className="size-3.5 mr-1.5" />
            Player
          </Button>
        )}
      </div>

      {/* Desktop: Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Panel: Primer Library */}
        <div className={`w-full lg:w-[380px] lg:shrink-0 ${view !== 'library' && 'hidden lg:block'}`}>
          <Card className="glass-card overflow-hidden border-border/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Radio className="size-4 text-ssa-purple" />
                  Primer Library
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                    {audioPrimers.length}
                  </Badge>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView('creator')}
                  className="text-ssa-purple hover:text-ssa-indigo lg:hidden text-xs h-7 px-2"
                >
                  <Plus className="size-3 mr-1" />
                  New
                </Button>
              </div>

              {/* Search */}
              <div className="relative mt-3">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search primers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-muted/30 border-border/40 focus:border-ssa-purple/40"
                />
              </div>

              {/* Subject Filter */}
              {Object.keys(subjectCounts).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <button
                    onClick={() => setSubjectFilter('all')}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ssa-purple ${
                      subjectFilter === 'all'
                        ? 'bg-ssa-purple/15 text-ssa-purple border border-ssa-purple/25'
                        : 'bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted'
                    }`}
                  >
                    All
                  </button>
                  {Object.entries(subjectCounts).map(([subject, count]) => (
                    <button
                      key={subject}
                      onClick={() => setSubjectFilter(subject)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ssa-purple ${
                        subjectFilter === subject
                          ? 'bg-ssa-purple/15 text-ssa-purple border border-ssa-purple/25'
                          : 'bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted'
                      }`}
                    >
                      {getSubjectIcon(subject)} {subject} ({count})
                    </button>
                  ))}
                </div>
              )}
            </CardHeader>

            <CardContent className="pt-0">
              {displayPrimers.length === 0 ? (
                <EmptyState />
              ) : (
                <ScrollArea className="max-h-[calc(100vh-380px)] lg:max-h-[calc(100vh-340px)]">
                  <div className="space-y-2 pr-1">
                    <AnimatePresence mode="popLayout">
                      {displayPrimers.map((primer) => (
                        <PrimerLibraryItem
                          key={primer.id}
                          primer={primer}
                          isActive={primer.id === activePrimerId}
                          onPlay={() => handlePlayPrimer(primer)}
                          onDelete={() => setDeleteConfirmId(primer.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Creator / Player */}
        <div className={`flex-1 min-w-0 ${view === 'library' ? 'hidden lg:block' : ''}`}>
          <AnimatePresence mode="wait">
            {activePrimer && view === 'player' ? (
              <AudioPlayer
                key={activePrimer.id}
                primer={activePrimer}
                onClose={handleClosePlayer}
              />
            ) : (
              <motion.div
                key="creator"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <PrimerCreator onGenerated={handleGenerated} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Show active primer player on desktop when in creator view */}
          {activePrimer && view === 'creator' && (
            <div className="mt-6 hidden lg:block">
              <AudioPlayer
                key={`desktop-${activePrimer.id}`}
                primer={activePrimer}
                onClose={handleClosePlayer}
              />
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 text-destructive" />
              Delete Audio Primer
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. The audio primer and all its chapters will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (deleteConfirmId) {
                  handleDeletePrimer(deleteConfirmId)
                }
              }}
            >
              <Trash2 className="size-3.5 mr-1.5" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SSAStudio

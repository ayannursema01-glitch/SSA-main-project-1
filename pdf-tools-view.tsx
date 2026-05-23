'use client'

import { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import * as pdfjsLib from 'pdfjs-dist'
import {
  Upload,
  FileText,
  Brain,
  X,
  Sparkles,
  ArrowLeft,
  ClipboardPaste,
  Loader2,
  FileCheck2,
  AlertCircle,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

// Dynamic import for PDF Intelligence to keep bundle size small
const PdfIntelligence = dynamic(() => import('./pdf-intelligence'), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="size-8 animate-spin text-ssa-purple" />
        <p className="text-sm text-muted-foreground">Loading PDF Intelligence...</p>
      </div>
    </div>
  ),
})

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface UploadedFile {
  name: string
  content: string
  size: number
  pageCount?: number
}

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

/* ═══════════════════════════════════════════════════════════════════
   PDF Text Extraction using pdfjs-dist
   ═══════════════════════════════════════════════════════════════════ */

async function extractPdfText(
  arrayBuffer: ArrayBuffer,
  onProgress?: (page: number, total: number) => void
): Promise<{ text: string; pageCount: number }> {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const totalPages = pdf.numPages
  const textParts: string[] = []

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item) => {
        // Type guard for text items
        if ('str' in item) {
          return (item as { str: string }).str
        }
        return ''
      })
      .join(' ')

    if (pageText.trim()) {
      textParts.push(`--- Page ${i} ---\n${pageText.trim()}`)
    }

    onProgress?.(i, totalPages)
  }

  return {
    text: textParts.join('\n\n'),
    pageCount: totalPages,
  }
}

/* ═══════════════════════════════════════════════════════════════════
   Upload Zone Component
   ═══════════════════════════════════════════════════════════════════ */

function UploadZone({
  onFileExtracted,
}: {
  onFileExtracted: (file: UploadedFile) => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showPasteDialog, setShowPasteDialog] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [progress, setProgress] = useState({ current: 0, total: 0, label: '' })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Extract text from a File object
  const extractTextFromFile = useCallback(async (file: File) => {
    // Size limit: 50MB
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 50MB.', { duration: 4000 })
      return
    }

    setIsProcessing(true)
    setProgress({ current: 0, total: 0, label: 'Reading file...' })

    try {
      // For text/markdown files, read directly
      if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        setProgress({ current: 1, total: 1, label: 'Reading text file...' })
        const text = await file.text()
        if (text.trim().length < 10) {
          toast.error('The file appears to be empty or has very little text content.')
          setShowPasteDialog(true)
          return
        }
        onFileExtracted({
          name: file.name,
          content: text,
          size: file.size,
        })
        toast.success(`Loaded "${file.name}" successfully!`)
        return
      }

      // For PDF files — use pdfjs-dist for proper extraction
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setProgress({ current: 0, total: 1, label: 'Loading PDF...' })

        const arrayBuffer = await file.arrayBuffer()

        setProgress({ current: 0, total: 1, label: 'Extracting text...' })

        const { text, pageCount } = await extractPdfText(arrayBuffer, (page, total) => {
          setProgress({ current: page, total, label: `Extracting page ${page} of ${total}...` })
        })

        if (text.trim().length > 50) {
          onFileExtracted({
            name: file.name,
            content: text,
            size: file.size,
            pageCount,
          })
          toast.success(`Extracted text from "${file.name}" (${pageCount} pages)!`)
        } else {
          // Not enough text extracted - prompt user to paste
          toast.info('Could not extract enough text from this PDF. It may be image-based. Please paste the text content instead.', {
            duration: 5000,
          })
          setShowPasteDialog(true)
          setPasteText('')
        }
        return
      }

      // For other document types - try reading as text
      try {
        setProgress({ current: 1, total: 1, label: 'Reading file...' })
        const text = await file.text()
        if (text && text.trim().length > 10) {
          onFileExtracted({
            name: file.name,
            content: text,
            size: file.size,
          })
          toast.success(`Loaded "${file.name}" successfully!`)
        } else {
          toast.error('Could not extract text from this file. Try pasting the content instead.')
          setShowPasteDialog(true)
        }
      } catch {
        toast.error('Could not read this file. Try pasting the content instead.')
        setShowPasteDialog(true)
      }
    } catch (err) {
      console.error('File extraction error:', err)
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      toast.error('Failed to process file. Please try pasting the text content instead.', {
        description: errorMsg.slice(0, 80),
      })
      setShowPasteDialog(true)
    } finally {
      setIsProcessing(false)
      setProgress({ current: 0, total: 0, label: '' })
    }
  }, [onFileExtracted])

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      extractTextFromFile(files[0])
    }
  }, [extractTextFromFile])

  // File input handler
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      extractTextFromFile(files[0])
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [extractTextFromFile])

  // Paste dialog submit
  const handlePasteSubmit = useCallback(() => {
    if (!pasteText.trim()) return
    onFileExtracted({
      name: 'Pasted Document',
      content: pasteText.trim(),
      size: new Blob([pasteText]).size,
    })
    setShowPasteDialog(false)
    setPasteText('')
    toast.success('Document content loaded!')
  }, [pasteText, onFileExtracted])

  const progressPercent = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0

  return (
    <>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8 transition-all duration-300 rounded-2xl border-2 border-dashed',
          isDragging
            ? 'border-ssa-purple bg-ssa-purple/5 scale-[1.01]'
            : 'border-border/40 bg-background/50',
          isProcessing && 'pointer-events-none'
        )}
      >
        {/* Animated icon */}
        <motion.div
          animate={isDragging ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-center size-24 rounded-3xl bg-gradient-to-br from-ssa-indigo/10 via-ssa-purple/10 to-red-500/10 border border-ssa-purple/20"
        >
          {isProcessing ? (
            <Loader2 className="size-10 text-ssa-purple animate-spin" />
          ) : (
            <Upload className={cn('size-10', isDragging ? 'text-ssa-purple' : 'text-ssa-purple/60')} />
          )}
        </motion.div>

        {/* Text */}
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold text-foreground">
            {isProcessing
              ? 'Processing document...'
              : isDragging
                ? 'Drop your file here!'
                : 'PDF Tools Workspace'}
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {isProcessing
              ? progress.label
              : 'Upload a PDF, text, or markdown file to analyze it with AI. Drag & drop or click to browse.'}
          </p>
        </div>

        {/* Progress bar during processing */}
        {isProcessing && progress.total > 0 && (
          <div className="w-full max-w-sm space-y-2">
            <Progress value={progressPercent} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress.label}</span>
              <span>{progressPercent}%</span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!isProcessing && (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="gap-2 bg-gradient-to-r from-ssa-indigo via-ssa-purple to-ssa-cyan text-white hover:opacity-90 h-11 px-6"
            >
              <Upload className="size-4" />
              Upload File
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowPasteDialog(true)}
              className="gap-2 border-ssa-purple/30 hover:bg-ssa-purple/5 h-11 px-6"
            >
              <ClipboardPaste className="size-4" />
              Paste Text
            </Button>
          </div>
        )}

        {/* Supported formats */}
        {!isProcessing && (
          <div className="flex flex-wrap items-center gap-2 justify-center">
            <span className="text-xs text-muted-foreground">Supported:</span>
            {['PDF', 'TXT', 'MD'].map((fmt) => (
              <Badge key={fmt} variant="secondary" className="h-5 px-2 text-[10px] font-medium bg-ssa-purple/10 text-ssa-purple border-0">
                {fmt}
              </Badge>
            ))}
            <span className="text-xs text-muted-foreground ml-1">Up to 50MB</span>
          </div>
        )}

        {/* Features preview */}
        {!isProcessing && !isDragging && (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mt-4 w-full max-w-2xl">
            {[
              { icon: FileText, label: 'Summary', desc: 'Study notes' },
              { icon: Brain, label: 'Keywords', desc: 'Key terms' },
              { icon: Sparkles, label: 'Flashcards', desc: 'Quick review' },
              { icon: FileCheck2, label: 'Quiz', desc: 'Test yourself' },
              { icon: AlertCircle, label: 'Chat', desc: 'Ask anything' },
            ].map((feature) => (
              <div key={feature.label} className="flex flex-col items-center text-center gap-1 p-3 rounded-xl bg-muted/30 border border-border/20">
                <feature.icon className="size-4 text-ssa-purple" />
                <p className="text-[11px] font-medium text-foreground">{feature.label}</p>
                <p className="text-[9px] text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md"
          className="hidden"
          onChange={handleFileInput}
          aria-label="Upload file"
        />
      </div>

      {/* Paste Text Dialog */}
      <Dialog open={showPasteDialog} onOpenChange={setShowPasteDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardPaste className="size-5 text-ssa-purple" />
              Paste Document Text
            </DialogTitle>
            <DialogDescription>
              Paste the text content from your document so SSA can analyze it with AI.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste your document text here...&#10;&#10;Tip: Open the PDF in your browser or a PDF reader, select all text (Ctrl+A), copy (Ctrl+C), and paste it here (Ctrl+V)."
            className="min-h-[200px] max-h-[400px] resize-y text-sm border-border/40 focus-visible:border-ssa-purple/50 focus-visible:ring-2 focus-visible:ring-ssa-purple focus-visible:ring-offset-2"
          />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setShowPasteDialog(false)} className="text-muted-foreground">
              Cancel
            </Button>
            <Button
              onClick={handlePasteSubmit}
              disabled={!pasteText.trim()}
              className="bg-gradient-to-r from-ssa-indigo via-ssa-purple to-ssa-cyan text-white hover:opacity-90"
            >
              <Sparkles className="size-4 mr-2" />
              Analyze with AI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Main PDF Tools View
   ═══════════════════════════════════════════════════════════════════ */

export default function PdfToolsView() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)

  const handleFileExtracted = useCallback((file: UploadedFile) => {
    setUploadedFile(file)
  }, [])

  const handleCloseAnalysis = useCallback(() => {
    setUploadedFile(null)
  }, [])

  // If we have an uploaded file with content, show the PDF Intelligence component
  if (uploadedFile && uploadedFile.content.trim()) {
    return (
      <div className="space-y-4">
        {/* Back button & file info */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCloseAnalysis}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Upload
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-red-500" />
            <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
              {uploadedFile.name}
            </span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[9px] font-medium bg-ssa-purple/10 text-ssa-purple border-0">
              {formatFileSize(uploadedFile.size)}
            </Badge>
            {uploadedFile.pageCount && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[9px] font-medium bg-ssa-cyan/10 text-ssa-cyan border-0">
                {uploadedFile.pageCount} pages
              </Badge>
            )}
          </div>
        </div>

        {/* PDF Intelligence Component */}
        <PdfIntelligence
          fileName={uploadedFile.name}
          fileContent={uploadedFile.content}
          onClose={handleCloseAnalysis}
        />
      </div>
    )
  }

  // Show upload zone
  return (
    <UploadZone onFileExtracted={handleFileExtracted} />
  )
}

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════
   Loading Spinner Fallback
   ═══════════════════════════════════════════════════════════════════ */

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="size-8 animate-spin text-ssa-purple" />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Lazy-loaded Dashboard Sub-components
   ═══════════════════════════════════════════════════════════════════ */

export const LazyAITutor = dynamic(() => import('./ai-tutor'), {
  loading: LoadingSpinner,
})

export const LazyFlashcardsView = dynamic(
  () => import('./flashcards').then((mod) => ({ default: mod.FlashcardsView })),
  { loading: LoadingSpinner }
)

export const LazyQuizzesView = dynamic(
  () => import('./quizzes').then((mod) => ({ default: mod.QuizzesView })),
  { loading: LoadingSpinner }
)

export const LazySmartNotesView = dynamic(() => import('./smart-notes'), {
  loading: LoadingSpinner,
})

export const LazyAnalyticsView = dynamic(() => import('./analytics'), {
  loading: LoadingSpinner,
})

export const LazyFocusTimer = dynamic(() => import('./focus-timer'), {
  loading: LoadingSpinner,
})

export const LazyCalendarView = dynamic(() => import('./calendar-view'), {
  loading: LoadingSpinner,
})

export const LazyFilesView = dynamic(() => import('./files-view'), {
  loading: LoadingSpinner,
})

export const LazyCollaborationView = dynamic(() => import('./collaboration-view'), {
  loading: LoadingSpinner,
})

export const LazySettingsView = dynamic(() => import('./settings-view'), {
  loading: LoadingSpinner,
})

export const LazyAdminView = dynamic(() => import('./admin-view'), {
  loading: LoadingSpinner,
})

export const LazyTeacherView = dynamic(() => import('./teacher-view'), {
  loading: LoadingSpinner,
})

export const LazySSAStudio = dynamic(() => import('./ssa-studio'), {
  loading: LoadingSpinner,
})

export const LazyWritingAuditView = dynamic(
  () => import('./writing-audit').then((mod) => ({ default: mod.WritingAuditView })),
  { loading: LoadingSpinner }
)

export const LazyPdfToolsView = dynamic(() => import('./pdf-tools-view'), {
  loading: LoadingSpinner,
})

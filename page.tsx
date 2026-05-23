'use client'

import dynamic from 'next/dynamic'
import { useAppStore } from '@/store/use-app-store'
import { LandingPage } from '@/components/ssa/landing-page'
import { AuthScreens } from '@/components/ssa/auth-screens'
import { ErrorBoundary } from '@/components/ssa/error-boundary'

// Lazy-load the heavy dashboard shell for performance
const DashboardShell = dynamic(() => import('@/components/ssa/dashboard-shell'), {
  loading: () => (
    <div className="flex items-center justify-center min-h-screen" role="status" aria-label="Loading dashboard">
      <div className="flex flex-col items-center gap-4">
        <div className="size-12 rounded-full border-4 border-muted border-t-ssa-purple animate-spin" />
        <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
      </div>
    </div>
  ),
})

export default function Home() {
  const { currentView, isAuthenticated } = useAppStore()

  // Landing page (default for unauthenticated users)
  if (currentView === 'landing' || (!isAuthenticated && currentView === 'dashboard')) {
    return (
      <ErrorBoundary>
        <LandingPage />
      </ErrorBoundary>
    )
  }

  // Auth screens
  if (currentView === 'login' || currentView === 'signup') {
    return (
      <ErrorBoundary>
        <AuthScreens />
      </ErrorBoundary>
    )
  }

  // Authenticated app (dashboard + all views)
  if (isAuthenticated) {
    return (
      <ErrorBoundary>
        <a href="#dashboard-main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-ssa-purple focus:text-white focus:rounded-md">Skip to content</a>
        <DashboardShell />
      </ErrorBoundary>
    )
  }

  // Default to landing
  return (
    <ErrorBoundary>
      <LandingPage />
    </ErrorBoundary>
  )
}

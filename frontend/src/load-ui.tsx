/**
 * Shared page-level load states — the replacement for the Next.js
 * app/loading.tsx and app/error.tsx that the Vite port dropped.
 */
import type { ErrorInfo } from 'react'
import { Component, type ReactNode } from 'react'

/** Skeleton with an announced status — users (and screen readers) never see a blank <main>. */
export function LoadingSkeleton({ label = 'Loading this page…' }: { label?: string }) {
  return (
    <div className="animate-pulse space-y-4 py-6" role="status" aria-busy="true">
      <p className="sr-only">{label}</p>
      <div className="h-40 rounded-2xl bg-brand-soft/50" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="h-28 rounded-2xl bg-brand-soft/50" />
        <div className="h-28 rounded-2xl bg-brand-soft/50" />
        <div className="h-28 rounded-2xl bg-brand-soft/50" />
      </div>
      <div className="h-56 rounded-2xl bg-brand-soft/50" />
    </div>
  )
}

/** Error card with retry — role="alert" so assistive tech announces the failure. */
export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-line bg-white p-8 text-center shadow-card" role="alert">
      <h1 className="text-xl font-extrabold tracking-tight text-navy">Something went wrong</h1>
      <p className="mt-1 text-[15px] text-muted">{error.message || 'The page failed to load.'}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Try again
        </button>
      )}
    </div>
  )
}

interface ErrorBoundaryProps {
  children: ReactNode
  /** Shown instead of the app when a render error escapes; the retry re-renders. */
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  caught: Error | undefined
  key: number
}

/** Class ErrorBoundary — React Router is fine here, but rendered trees still need a net. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { caught: undefined, key: 0 }

  static getDerivedStateFromError(caught: Error): Partial<ErrorBoundaryState> {
    return { caught }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Until an observability pipeline exists, render crashes must be visible.
    console.error('[app] render error boundary', error, info.componentStack)
  }

  private retry = () => this.setState((previous) => ({ caught: undefined, key: previous.key + 1 }))

  render() {
    if (this.state.caught) {
      return (
        this.props.fallback ?? (
          <ErrorState error={this.state.caught} onRetry={this.retry} />
        )
      )
    }
    return <div key={this.state.key}>{this.props.children}</div>
  }
}

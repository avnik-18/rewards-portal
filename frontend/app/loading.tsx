export default function Loading() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 p-6" role="status" aria-live="polite">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand/20 border-t-brand" aria-hidden />
      <p className="text-[13px] font-semibold text-muted">Loading…</p>
    </div>
  )
}

'use client'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-[15px] font-extrabold text-navy">Something went wrong</p>
      <p className="max-w-sm text-[12.5px] text-muted">{error.message || 'An unexpected error occurred.'}</p>
      <button
        onClick={reset}
        className="rounded-xl bg-brand px-5 py-2.5 text-[13px] font-extrabold text-white transition hover:brightness-110"
      >
        Try again
      </button>
    </div>
  )
}

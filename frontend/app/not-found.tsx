import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-[15px] font-extrabold text-navy">We couldn't find that page</p>
      <p className="max-w-sm text-[12.5px] text-muted">The person or page you were looking for doesn't exist.</p>
      <Link
        href="/"
        className="rounded-xl bg-brand px-5 py-2.5 text-[13px] font-extrabold text-white transition hover:brightness-110"
      >
        Back to dashboard
      </Link>
    </div>
  )
}

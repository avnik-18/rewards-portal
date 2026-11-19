import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { Avatar } from '@/components/atoms'
import { getMe } from '@/lib/data-api'
import { usePageData } from '@/hooks/use-page-data'

/** Right side of the header — notifications bell + avatar profile-menu disclosure.
 *  The name + designation come from the actor-scoped GET /me (whoever signed in). */
export default function HeaderActions() {
  const [menuOpen, setMenuOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const me = usePageData(getMe, [])
  const designation = me.data?.title ?? me.data?.department ?? undefined

  useEffect(() => {
    if (!menuOpen) return
    const onDocumentClick = (e: MouseEvent) => {
      if (!triggerRef.current?.parentElement?.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDocumentClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocumentClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <div className="ml-auto flex items-center gap-1.5">
      <button aria-label="Notifications" className="relative rounded-full p-2 text-muted transition hover:bg-slate-100">
        <Bell size={17} aria-hidden />
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-coral" aria-hidden />
      </button>
      <div className="relative flex items-center">
        <button
          ref={triggerRef}
          aria-label="Profile menu"
          aria-expanded={menuOpen}
          className="flex items-center gap-1.5 rounded-full p-0.5 pr-2 transition hover:bg-slate-100"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Avatar id="me" size={36} />
        </button>
        {menuOpen && (
          // sir: drop role=menu — a plain disclosure with links (two-item menu)
          <div className="absolute right-0 top-12 z-40 w-60 overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-lift">
            <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
              <Avatar id="me" size={40} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-navy">{me.data?.full_name ?? 'Profile'}</p>
                {designation && <p className="truncate text-xs text-muted">{designation}</p>}
              </div>
            </div>
            <div className="my-1 h-px bg-line" />
            {/* sir: Log out is hidden until real auth exists — never show a silent no-op */}
            <Link
              to="/profile"
              onClick={() => setMenuOpen(false)}
              className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-ink transition hover:bg-slate-50"
            >
              My profile
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

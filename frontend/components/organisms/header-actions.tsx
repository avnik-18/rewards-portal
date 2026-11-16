import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { Avatar } from '@/components/atoms'
import { getMe, getUnreadCount, getUnreadFeed, markAllNotificationsRead, type UnreadNotification } from '@/lib/data-api'
import { usePageData } from '@/hooks/use-page-data'

/** Right side of the header — notifications bell + avatar profile-menu disclosure.
 *  The person card comes from the actor-scoped GET /me (whoever signed in); the
 *  bell shows the live unread badge (GET /notifications/unread-count) and its
 *  panel reads the unread feed (GET /notifications) with mark-all-read
 *  (POST /notifications/read — a read row disappears, the badge drops to 0). */
export default function HeaderActions() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)
  const me = usePageData(getMe, [])
  const designation = me.data?.title ?? me.data?.department ?? undefined

  const [unread, setUnread] = useState<number>()
  const [feed, setFeed] = useState<UnreadNotification[] | undefined>(undefined)
  const [markingRead, setMarkingRead] = useState(false)

  const refreshUnread = () => getUnreadCount().then(setUnread)

  const toggleBell = () => {
    const opening = !notifOpen
    setNotifOpen(opening)
    setMenuOpen(false)
    if (opening) {
      setFeed(undefined)
      getUnreadFeed()
        .then(setFeed)
        .catch(() => setFeed([])) // honest empty panel + the badge stays truthful
      refreshUnread()
    }
  }

  const markAllRead = () => {
    setMarkingRead(true)
    markAllNotificationsRead()
      .then(() =>
        getUnreadFeed()
          .then(setFeed)
          .catch(() => setFeed([])),
      )
      .catch(() => undefined)
      .finally(() => {
        setMarkingRead(false)
        refreshUnread()
      })
  }

  useEffect(() => {
    if (!menuOpen && !notifOpen) return
    const onDocumentClick = (e: MouseEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) {
        setMenuOpen(false)
        setNotifOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        setNotifOpen(false)
        headerRef.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('mousedown', onDocumentClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocumentClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen, notifOpen])

  const notifRow = (n: UnreadNotification) => {
    const from = n.giver_name ?? 'Someone'
    const praise = n.points !== null
    const copy = praise
      ? `${from} recognised you (+${n.points} pts)`
      : n.type.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
    const day = new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    return (
      <li key={n.id} className="border-b border-line px-3 py-2.5 last:border-b-0">
        <p className="truncate text-[12.5px] font-bold text-ink">{copy}</p>
        {n.message && <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-muted">{n.message}</p>}
        <p className="mt-0.5 text-[10.5px] font-semibold text-slate-400">{day}</p>
      </li>
    )
  }

  return (
    <div className="relative ml-auto flex items-center gap-1.5" ref={headerRef}>
      <button
        aria-label="Notifications"
        aria-expanded={notifOpen}
        className="relative rounded-full p-2 text-muted transition hover:bg-slate-100"
        onClick={toggleBell}
      >
        <Bell size={17} aria-hidden />
        {/* sir: the dot only exists when the feed says something unread */}
        {unread !== undefined && unread > 0 && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-coral" aria-hidden />
        )}
      </button>

      {notifOpen && (
        <div className="absolute right-0 top-12 z-40 w-72 overflow-hidden rounded-2xl border border-line bg-white shadow-lift">
          <p className="flex items-center gap-2 px-3 pt-3 text-[13px] font-extrabold text-navy">
            Notifications
            {unread !== undefined && unread > 0 && (
              <span className="rounded-full bg-coral px-2 py-0.5 text-[10px] font-extrabold text-white">
                {unread} unread
              </span>
            )}
          </p>
          <ul className="mt-2 max-h-72 overflow-y-auto text-left">
            {feed === undefined ? (
              <li className="px-3 py-4 text-[12px] text-muted">Loading the unread feed…</li>
            ) : feed.length === 0 ? (
              <li className="mx-2 my-2 rounded-xl bg-slate-50 px-3 py-3 text-[12.5px] leading-relaxed text-muted">
                You are all caught up — nothing unread right now.
              </li>
            ) : (
              feed.map(notifRow)
            )}
          </ul>
          {feed !== undefined && feed.length > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              disabled={markingRead}
              className="m-2 block w-[calc(100%-1rem)] rounded-xl bg-brand px-3 py-2 text-[12.5px] font-bold text-white transition hover:bg-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {markingRead ? 'Marking read…' : 'Mark all read'}
            </button>
          )}
        </div>
      )}

      <div className="relative flex items-center">
        <button
          aria-label="Profile menu"
          aria-expanded={menuOpen}
          className="flex items-center gap-1.5 rounded-full p-0.5 pr-2 transition hover:bg-slate-100"
          onClick={() => {
            setMenuOpen(!menuOpen)
            setNotifOpen(false)
          }}
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

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Bell, Gift, Home, PartyPopper, Users } from 'lucide-react'
import { Avatar } from '@/components/atoms'

const NAV = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/team', label: 'My Team', icon: Users },
  { href: '/rewards', label: 'My Rewards', icon: Gift },
] as const

/** Primary navbar — highlighted by the actual route (client island). */
export default function PrimaryNav() {
  const pathname = usePathname()

  return (
    <nav className="relative hidden flex-1 items-stretch gap-1 overflow-x-auto lg:flex" aria-label="Primary">
      {NAV.map((n) => {
        const active = pathname === n.href
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? 'page' : undefined}
            className={`relative flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-semibold transition outline-none focus-visible:bg-brand-soft/50 ${
              active ? 'text-navy' : 'text-muted hover:text-ink'
            }`}
          >
            <n.icon size={17} aria-hidden />
            {n.label}
            <span
              aria-hidden
              className={`absolute bottom-0 left-3 h-[2.5px] w-[calc(100%-24px)] rounded-full bg-brand transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`}
            />
          </Link>
        )
      })}
    </nav>
  )
}

/** Mobile secondary nav row — rounded chips under the header (ditto old). */
export function MobileChipNav() {
  const pathname = usePathname()

  return (
    <nav
      className="rail-scroll flex gap-1.5 overflow-x-auto border-t border-line px-4 py-2 lg:hidden"
      aria-label="Primary mobile"
    >
      {NAV.map((n) => {
        const active = pathname === n.href
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition ${
              active ? 'bg-brand text-white' : 'bg-slate-100 text-muted'
            }`}
          >
            {n.label}
          </Link>
        )
      })}
    </nav>
  )
}

/** Mobile bottom bar (lg:hidden): Home · gold Praise FAB · Rewards · My Team. */
export function MobileBottomBar() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur-md lg:hidden"
      aria-label="Mobile"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 items-center px-2">
        <MobileTab href="/" icon={<Home size={21} aria-hidden />} label="Home" active={pathname === '/'} />
        <div className="relative flex justify-center">
          <Link
            href="/recognize"
            aria-label="Recognize a teammate"
            className="absolute -top-6 flex h-14 w-14 animate-pulse-dot items-center justify-center rounded-full bg-gold text-[#3d2b00] shadow-fab transition active:scale-95"
          >
            <PartyPopper size={22} aria-hidden />
          </Link>
          <span className="pt-2 text-xs font-semibold text-gold-ink">Praise</span>
        </div>
        <MobileTab
          href="/rewards"
          icon={<Gift size={21} aria-hidden />}
          label="Rewards"
          active={pathname === '/rewards'}
        />
        <MobileTab
          href="/team"
          icon={<Users size={21} aria-hidden />}
          label="My Team"
          active={pathname === '/team'}
          badge
        />
      </div>
    </nav>
  )
}

function MobileTab({
  href,
  icon,
  label,
  active,
  badge = false,
}: {
  href: string
  icon: React.ReactNode
  label: string
  active: boolean
  badge?: boolean
}) {
  return (
    <Link
      href={href}
      className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[10.5px] font-semibold transition ${active ? 'text-brand' : 'text-muted'}`}
    >
      {icon}
      {label}
      {badge && <span className="absolute right-[18%] top-1 h-2 w-2 rounded-full bg-coral" aria-hidden />}
    </Link>
  )
}

/** Right side of the header — notifications + avatar toggling the profile menu. */
export function HeaderActions() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // click outside closes, Escape closes and refocuses the trigger
  useEffect(() => {
    if (!menuOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        document.querySelector<HTMLButtonElement>('[aria-label="Profile menu"]')?.focus()
      }
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <div className="ml-auto flex items-center gap-1.5">
      <button aria-label="Notifications" className="relative rounded-full p-2 text-muted transition hover:bg-slate-100">
        <Bell size={17} aria-hidden />
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-coral" aria-hidden />
      </button>
      <div className="relative flex items-center" ref={menuRef}>
        <button
          aria-label="Profile menu"
          aria-expanded={menuOpen}
          className="flex items-center gap-1.5 rounded-full p-0.5 pr-2 transition hover:bg-slate-100"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Avatar id="me" size={36} />
        </button>
        {menuOpen && (
          <div role="menu" className="absolute right-0 top-12 z-40 w-60 animate-rise overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-lift">
            <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
              <Avatar id="me" size={40} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-navy">Ayan</p>
                <p className="truncate text-xs text-muted">Senior Eng Manager</p>
              </div>
            </div>
            <div className="my-1 h-px bg-line" />
            <button
              role="menuitem"
              onClick={() => { setMenuOpen(false); window.location.href = '/profile' }}
              className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-ink transition hover:bg-slate-50"
            >
              My profile
            </button>
            <button
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-ink transition hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

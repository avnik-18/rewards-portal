import { Link, useLocation } from 'react-router-dom'
import { Home, Users, Gift } from 'lucide-react'

const NAV = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/team', label: 'My Team', icon: Users },
  { href: '/rewards', label: 'My Rewards', icon: Gift },
] as const

/** Desktop primary navbar — highlighted by the actual route (client island). */
export default function PrimaryNav() {
  const pathname = useLocation().pathname

  return (
    <nav className="relative hidden flex-1 items-stretch gap-1 overflow-x-auto lg:flex" aria-label="Primary">
      {NAV.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            to={item.href}
            aria-current={active ? 'page' : undefined}
            className={`relative flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-semibold transition outline-none focus-visible:bg-brand-soft/50 ${
              active ? 'text-navy' : 'text-muted hover:text-ink'
            }`}
          >
            <item.icon size={17} aria-hidden />
            {item.label}
            <span
              aria-hidden
              className={`absolute bottom-0 left-3 h-[2.5px] w-[calc(100%-24px)] rounded-full bg-brand transition-opacity ${
                active ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </Link>
        )
      })}
    </nav>
  )
}

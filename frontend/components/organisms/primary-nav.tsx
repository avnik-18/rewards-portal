import { Link, useLocation } from 'react-router-dom'
import { Award, History, Home, Users, Gift, Settings } from 'lucide-react'
import type { MeProfile } from '@/lib/data-api'

const NAV_EMPLOYEE = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/team', label: 'My Team', icon: Users },
  { href: '/rewards', label: 'My Rewards', icon: Gift },
  { href: '/recognition-history', label: 'Recognition history', icon: History },
]

// Leaders run the cycle AND keep their own lanes; admins work the portal.
// My Team is off-cycle for now — the award flow leads, then personal lanes.
const NAV_LEADER = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/awards-cycle', label: 'Award cycle', icon: Award },
  { href: '/rewards', label: 'My Rewards', icon: Gift },
  { href: '/recognition-history', label: 'Recognition history', icon: History },
]

const NAV_ADMIN = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/manage', label: 'Manage', icon: Settings },
  { href: '/awards-cycle', label: 'Award cycle', icon: Award },
  { href: '/rewards', label: 'My Rewards', icon: Gift },
  { href: '/recognition-history', label: 'Recognition history', icon: History },
] as const

type NavItem = (typeof NAV_LEADER)[number]

const NAV_BY_PERSONA: Record<NonNullable<MeProfile['persona']>, readonly NavItem[]> = {
  employee: NAV_EMPLOYEE,
  dh: NAV_LEADER,
  leader: NAV_LEADER,
  admin: NAV_ADMIN,
}

/** Desktop primary navbar — highlighted by the actual route (client island). */
export default function PrimaryNav({ persona }: { persona?: MeProfile['persona'] }) {
  const pathname = useLocation().pathname
  const items = NAV_BY_PERSONA[persona ?? 'employee'] ?? NAV_EMPLOYEE

  return (
    <nav className="relative hidden flex-1 items-stretch gap-1 overflow-x-auto lg:flex" aria-label="Primary">
      {items.map((item) => {
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

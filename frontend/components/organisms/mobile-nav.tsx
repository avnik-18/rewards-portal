import { Link, useLocation } from 'react-router-dom'
import { Gift, Home, PartyPopper } from 'lucide-react'

const NAV = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/rewards', label: 'My Rewards', icon: Gift },
] as const

/** Mobile secondary nav — rounded chips under the header (lg:hidden). */
export function MobileChipNav() {
  const pathname = useLocation().pathname

  return (
    <nav
      className="rail-scroll flex gap-1.5 overflow-x-auto border-t border-line px-4 py-2 lg:hidden"
      aria-label="Primary mobile"
    >
      {NAV.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            to={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition ${
              active ? 'bg-brand text-white' : 'bg-slate-100 text-muted'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

/** Mobile bottom bar (lg:hidden): Home · gold Praise FAB · Rewards. */
export function MobileBottomBar() {
  const pathname = useLocation().pathname

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur-md lg:hidden"
      aria-label="Mobile"
    >
      <div className="mx-auto grid max-w-md grid-cols-3 items-center px-2">
        <MobileTab href="/" icon={<Home size={21} aria-hidden />} label="Home" active={pathname === '/'} />
        <div className="relative flex justify-center">
          <Link
            to="/recognize"
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
      to={href}
      className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[10.5px] font-semibold transition ${
        active ? 'text-brand' : 'text-muted'
      }`}
    >
      {icon}
      {label}
      {badge && <span className="absolute right-[18%] top-1 h-2 w-2 rounded-full bg-coral" aria-hidden />}
    </Link>
  )
}

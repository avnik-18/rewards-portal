import type { ReactNode } from 'react'
import { CalendarCheck, Users } from 'lucide-react'
import type { TeamTab } from './TeamScreen'

interface TeamTabChipsProps {
  tab: TeamTab
  onTab: (tab: TeamTab) => void
  approvalsCount: number
}

/** The two screen-level tabs — My team info / My Approvals, with a badge. */
export default function TeamTabChips({ tab, onTab, approvalsCount }: TeamTabChipsProps) {
  const TABS: { key: TeamTab; label: string; icon: ReactNode; badge?: number }[] = [
    { key: 'team', label: 'My team info', icon: <Users size={16} /> },
    { key: 'approvals', label: 'My Approvals', icon: <CalendarCheck size={16} />, badge: approvalsCount },
  ]
  return (
    <div className="rail-scroll mb-6 flex gap-2 overflow-x-auto pb-1">
      {TABS.map((tabChip) => (
        <button
          key={tabChip.key}
          onClick={() => tabChip.key !== tab && onTab(tabChip.key)}
          className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-[13.5px] font-bold transition ${tab === tabChip.key ? 'border-brand bg-brand text-white shadow-card' : 'border-line bg-white text-muted hover:text-ink'}`}
        >
          {tabChip.icon}
          {tabChip.label}
          {tabChip.badge ? (
            <span
              className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10.5px] font-extrabold ${tab === tabChip.key ? 'bg-white/25 text-white' : 'bg-brand-soft text-brand'}`}
            >
              {tabChip.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { TEAMS } from '@/lib/mock-data-parts/team'

export type TeamFilter = 'all' | 'humana' | 'dev'

/** Team dropdown — "All Teams" plus every team from the directory. */
export default function TeamFilterDropdown({
  team,
  onTeam,
}: {
  team: TeamFilter
  onTeam: (team: TeamFilter) => void
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const activeTeamName = team === 'all' ? 'All Teams' : (TEAMS.find((teamRecord) => teamRecord.id === team)?.name ?? 'All Teams')

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-label="Select team"
        aria-expanded={dropdownOpen}
        className={`flex items-center gap-2 rounded-xl border bg-white pl-4 pr-3 py-2.5 text-[14px] font-bold text-navy shadow-card transition hover:border-brand/40 ${dropdownOpen ? 'border-brand' : 'border-line'}`}
      >
        {activeTeamName}
        <ChevronDown
          size={15}
          className={`text-muted transition-transform duration-200 ${dropdownOpen ? 'rotate-180 text-brand' : ''}`}
        />
      </button>
      {dropdownOpen && (
        <div className="absolute left-0 top-13 z-30 mt-1 w-60 animate-rise overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-lift">
          {[{ id: 'all' as const, name: 'All Teams' }, ...TEAMS].map((teamOption) => (
            <button
              key={teamOption.id}
              onClick={() => {
                onTeam(teamOption.id)
                setDropdownOpen(false)
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13.5px] font-semibold transition ${team === teamOption.id ? 'bg-brand-soft text-navy' : 'text-ink hover:bg-slate-50'}`}
            >
              <span className="flex items-center gap-2.5">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-extrabold ${team === teamOption.id ? 'bg-brand text-white' : 'bg-slate-100 text-muted'}`}
                >
                  {teamOption.name.charAt(0).toUpperCase()}
                </span>
                {teamOption.name}
              </span>
              {team === teamOption.id && <Check size={14} className="text-brand" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

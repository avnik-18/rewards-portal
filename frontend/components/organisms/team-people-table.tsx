'use client'

import { Eye, Send } from 'lucide-react'
import type { RefObject } from 'react'
import { Avatar, Btn, Card, Chip } from '@/components/atoms'
import { CORE_VALUES } from '@/lib/data-api'
import { TEAMS, type TeamId } from '@/lib/data-api'
import { person, personDisplayName } from '@/lib/data-api'
import type { TeamRow } from '@/lib/data-api'

const TEAM_CHIP: Record<TeamId, string> = {
  humana: 'bg-brand-soft text-brand',
  dev: 'bg-violet-soft text-violet',
}

interface TeamPeopleTableProps {
  /** Rows after the team filter, team order preserved. */
  visible: TeamRow[]
  /** The active filter — when 'all', rows carry their team chip. */
  team: 'all' | 'humana' | 'dev'
  headRef: RefObject<HTMLDivElement | null>
  bodyRef: RefObject<HTMLDivElement | null>
  onBodyScroll: () => void
  onOpenProfile: (id: string) => void
  onPraise: (id: string) => void
  onOpenInfo: (id: string) => void
}

/** The team roster table — sticky head, scroll-synced rows per member. */
export default function TeamPeopleTable({
  visible,
  team,
  headRef,
  bodyRef,
  onBodyScroll,
  onOpenProfile,
  onPraise,
  onOpenInfo,
}: TeamPeopleTableProps) {
  return (
    <Card className="p-0">
      <div
        ref={headRef}
        className="sticky top-16 z-10 rounded-t-2xl border-b border-line bg-slate-50/95 backdrop-blur-sm"
      >
        <div className="grid min-w-[780px] grid-cols-[56px_minmax(230px,1.35fr)_minmax(200px,1fr)_170px_210px] items-center gap-4 px-5 py-3 text-[10.5px] font-extrabold font-mono uppercase tracking-[0.12em] text-muted">
          <span>S.no</span>
          <span>Name</span>
          <span>Designation</span>
          <span>Primary value</span>
          <span className="text-center">Actions</span>
        </div>
      </div>
      <div ref={bodyRef} onScroll={onBodyScroll} className="rail-scroll rounded-b-2xl overflow-x-auto">
        <div className="min-w-[780px]">
          {visible.map((row, index) => {
            const memberValue = CORE_VALUES[row.valuesTop as keyof typeof CORE_VALUES]
            return (
              <div
                key={row.id}
                className={`grid grid-cols-[56px_minmax(230px,1.35fr)_minmax(200px,1fr)_170px_210px] items-center gap-4 border-b border-line px-5 py-3.5 transition hover:bg-brand-soft/25 ${index === visible.length - 1 ? 'rounded-b-2xl border-b-0' : ''}`}
                style={{ animation: `rise .35s ${index * 40}ms both` }}
              >
                <span className="tnum text-[13px] font-extrabold text-muted">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <button
                  onClick={() => onOpenProfile(row.id)}
                  className="group flex min-w-0 items-center gap-3 text-left"
                >
                  <Avatar id={row.id} size={36} />
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="block truncate text-[13.5px] font-extrabold text-navy group-hover:text-brand group-hover:underline">
                      {personDisplayName(row.id)}
                    </span>
                    {team === 'all' && (
                      <Chip className={`shrink-0 px-1.5 py-0 text-[10px] font-bold ${TEAM_CHIP[row.team]}`}>
                        {TEAMS.find((teamRecord) => teamRecord.id === row.team)?.name}
                      </Chip>
                    )}
                  </span>
                </button>
                <span className="truncate text-[13px] font-medium text-muted">{person(row.id)?.title ?? 'Unknown'}</span>
                <span>
                  <Chip className={`${memberValue.soft} ${memberValue.ink}`}>{memberValue.label}</Chip>
                </span>
                <span className="flex items-center justify-center gap-2.5">
                  <Btn size="sm" variant="primary" className="!h-8 !px-3" onClick={() => onPraise(row.id)}>
                    <Send size={12} /> Praise
                  </Btn>
                  <Btn
                    size="sm"
                    variant="outline"
                    className="!border-brand/25 !px-3 font-bold text-[#0a675c] hover:bg-brand-soft/50"
                    onClick={() => onOpenInfo(row.id)}
                  >
                    <Eye size={13} /> View info
                  </Btn>
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

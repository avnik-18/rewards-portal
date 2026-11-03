'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GitBranch, PartyPopper } from 'lucide-react'
import MemberInfoModal from './member-info-modal'
import TeamFilterDropdown from './team-filter-dropdown'
import TeamPeopleTable from './team-people-table'
import TeamTabChips from './team-tab-chips'
import MyTree from '@/components/organisms/MyTree'
import ApprovalsBoard from '@/components/organisms/ApprovalsBoard'
import type { ApprovalItem } from '@/lib/mock-data'
import type { TeamRow, RecognitionTreeData } from '@/lib/data-api'
import { fmtNum } from '@/lib/format'

export type TeamTab = 'team' | 'approvals'

export interface TeamScreenProps {
  /** Team member stat rows, one per member across teams. */
  rows: TeamRow[]
  /** Approval requests backing the My Approvals tab. */
  approvals: ApprovalItem[]
  /** Unread approval-ish notifications for the tab badge. */
  approvalsCount: number
  /** Recognition tree data for the overlay. */
  tree: RecognitionTreeData
}

export default function TeamScreen({ rows, approvals, approvalsCount, tree }: TeamScreenProps) {
  const router = useRouter()
  const [tab, setTab] = useState<TeamTab>('team')
  const [teamFilter, setTeamFilter] = useState<'all' | 'humana' | 'dev'>('humana')
  const [viewId, setViewId] = useState<string | null>(null)
  const [treeOpen, setTreeOpen] = useState(false)
  const headRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const syncHeaderScroll = () => {
    if (headRef.current && bodyRef.current) headRef.current.scrollLeft = bodyRef.current.scrollLeft
  }

  const openProfile = (id: string) => router.push(`/profile?id=${id}`)
  const onPraise = (id: string) => router.push(`/recognize?to=${id}`)

  const visibleRows = teamFilter === 'all' ? rows : rows.filter((row) => row.team === teamFilter)
  const quarterTotal = visibleRows.reduce((sum, row) => sum + row.given + row.received, 0)

  return (
    <div>
      <TeamTabChips tab={tab} onTab={setTab} approvalsCount={approvalsCount} />

      {tab === 'approvals' && (
        <div>
          <h1 className="mb-6 text-3xl font-extrabold tracking-tight text-navy">Approvals inbox</h1>
          <ApprovalsBoard items={approvals} />
        </div>
      )}

      {tab === 'team' && (
        <div>
          {/* Header + team dropdown + small stat */}
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-navy md:text-[34px]">Team</h1>
              <TeamFilterDropdown team={teamFilter} onTeam={setTeamFilter} />
            </div>

            {/* My tree + mini recognitions stat */}
            <div className="flex flex-wrap items-center gap-3 self-start sm:mb-1">
              <button
                onClick={() => setTreeOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-[13.5px] font-bold text-white shadow-[0_1px_2px_rgba(10,31,68,.18)] transition hover:bg-brand-deep"
              >
                <GitBranch size={16} /> Recognition Tree
              </button>
              <div className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-2.5 shadow-card">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <PartyPopper size={15} />
                </span>
                <div className="leading-tight">
                  <p className="tnum text-[18px] font-extrabold text-navy">{fmtNum(quarterTotal)}</p>
                  <p className="text-[10.5px] font-bold font-mono uppercase tracking-wide text-muted">
                    Recognitions · this quarter
                  </p>
                </div>
              </div>
            </div>
          </div>

          <MyTree open={treeOpen} onClose={() => setTreeOpen(false)} data={tree} />

          <TeamPeopleTable
            visible={visibleRows}
            team={teamFilter}
            headRef={headRef}
            bodyRef={bodyRef}
            onBodyScroll={syncHeaderScroll}
            onOpenProfile={openProfile}
            onPraise={onPraise}
            onOpenInfo={setViewId}
          />
        </div>
      )}

      <MemberInfoModal
        viewRow={visibleRows.find((row) => row.id === viewId) ?? null}
        onClose={() => setViewId(null)}
        onOpenProfile={openProfile}
        onPraise={onPraise}
      />
    </div>
  )
}

import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GitBranch } from 'lucide-react'
import MemberInfoModal from './member-info-modal'
import TeamFilterDropdown from './team-filter-dropdown'
import TeamPeopleTable from './team-people-table'
import MyTree from '@/components/organisms/MyTree'
import type { TeamRow, RecognitionTreeData } from '@/lib/data-api'

export interface TeamScreenProps {
  /** Team member stat rows, one per member across teams. */
  rows: TeamRow[]
  /** Recognition tree data for the overlay. */
  tree: RecognitionTreeData
  /** Set when an award card said "Nominate Employee" — the roster rows
   *  carry a nominate action for this award (My Team → member → compose). */
  awardName?: string | null
  /** Completes the award → My Team handoff: href for a member's nominate action. */
  nominateHref?: (memberRosterId: string) => string
}

export default function TeamScreen({ rows, tree, awardName, nominateHref }: TeamScreenProps) {
  const navigate = useNavigate()
  const [teamFilter, setTeamFilter] = useState<'all' | 'humana' | 'dev'>('humana')
  const [viewId, setViewId] = useState<string | null>(null)
  const [treeOpen, setTreeOpen] = useState(false)
  const headRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const syncHeaderScroll = () => {
    if (headRef.current && bodyRef.current) headRef.current.scrollLeft = bodyRef.current.scrollLeft
  }

  const openProfile = (id: string) => navigate(`/profile?id=${id}`)
  const onPraise = (id: string) => navigate(`/recognize?to=${id}`)
  const onNominate = nominateHref ? (id: string) => navigate(nominateHref(id)) : undefined

  const visibleRows = teamFilter === 'all' ? rows : rows.filter((row) => row.team === teamFilter)

  return (
    <div>
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-navy md:text-[34px]">Team</h1>
          <TeamFilterDropdown team={teamFilter} onTeam={setTeamFilter} />
        </div>

        <button
          onClick={() => setTreeOpen(true)}
          className="flex items-center gap-2 self-start rounded-xl bg-brand px-4 py-2.5 text-[13.5px] font-bold text-white shadow-[0_1px_2px_rgba(10,31,68,.18)] transition hover:bg-brand-deep sm:mb-1"
        >
          <GitBranch size={16} /> Recognition Tree
        </button>
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
        onNominate={onNominate}
        awardName={awardName ?? null}
      />

      <MemberInfoModal
        viewRow={visibleRows.find((row) => row.id === viewId) ?? null}
        onClose={() => setViewId(null)}
        onOpenProfile={openProfile}
        onPraise={onPraise}
      />
    </div>
  )
}

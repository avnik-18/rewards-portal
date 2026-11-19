import { Avatar } from '../atoms'
import { fmtNum } from '@/lib/format'
import type { LeaderRow } from '@/lib/data-api'

export interface LeaderboardProps {
  /** Leaderboard rows, already sorted best-first; names resolved by the data layer. */
  rows: LeaderRow[]
}

/** Rank-chip palette cycling lavender/amber, pink for fifth — as designed. */
const RANK_CHIP = [
  'bg-[#ece9fe] text-[#6d5bd0]',
  'bg-[#fdecc8] text-[#a16207]',
  'bg-[#ece9fe] text-[#6d5bd0]',
  'bg-[#fdecc8] text-[#a16207]',
  'bg-[#fce7f3] text-[#c026d3]',
]

/** Server-safe: static top-5 table with no client interactivity. */
export default function Leaderboard({ rows }: LeaderboardProps) {
  const top = rows.slice(0, 5)
  const short = (name: string) =>
    name.split(' ').length > 1 ? `${name.split(' ')[0]} ${name.split(' ').at(-1)![0]}.` : name

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e3ebf2] bg-white">
      <div className="flex items-center justify-between px-5 pb-3 pt-4">
        <p className="text-[15.5px] font-bold text-[#0b2a4a]">🏆 Team leaderboard</p>
        <a className="text-[13px] font-semibold text-[#0f7f7f] no-underline transition hover:brightness-110" href="#">
          View all
        </a>
      </div>
      <div className="grid grid-cols-[68px_1fr_92px] items-center border-y border-[#e3ebf2] bg-[#f4f7fa] px-5 py-2.5 text-[12.5px] font-semibold text-[#55697d] max-sm:hidden">
        <span>Rank</span>
        <span>Team member</span>
        <span className="text-right">Points</span>
      </div>
      <ol>
        {top.map((teamRow, index) => (
          <li
            key={teamRow.id}
            className={`grid grid-cols-[68px_1fr_92px] items-center px-5 py-2.5 ${index % 2 === 1 ? 'bg-[#eef7f4]' : 'bg-white'}`}
          >
            <span className="mr-1 flex h-6 w-8 shrink-0 items-center justify-center">
              <span
                className={`tnum flex h-6 w-9 items-center justify-center rounded-full text-[12px] font-bold ${RANK_CHIP[index]}`}
              >
                {/* truth over presentation: the caller's true-rank row is
                    appended below the top-5, so the chip reports the API's
                    own rank() value when present */}
                {teamRow.rank ?? index + 1}
              </span>
            </span>
            <span className="flex min-w-0 items-center gap-2.5">
              <Avatar id={teamRow.id} size={34} />
              <span className="truncate text-[14.5px] font-semibold text-[#0b2a4a]">
                {short(teamRow.name)}
                {(teamRow.id === 'me' || teamRow.me) && (
                  <span className="ml-1.5 rounded-full bg-[#17a06a] px-2 py-0.5 align-middle text-[10.5px] font-bold text-white">
                    You
                  </span>
                )}
              </span>
            </span>
            <span className="flex justify-end">
              <b className="tnum rounded-full bg-[#d9ecff] px-3 py-1 text-[13px] font-bold text-[#0b2a4a]">
                {fmtNum(teamRow.pts)}
              </b>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

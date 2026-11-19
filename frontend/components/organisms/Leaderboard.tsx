import { Avatar } from '../atoms'
import { fmtNum } from '@/lib/format'
import type { LeaderRow } from '@/lib/data-api'

export interface LeaderboardProps {
  /** Leaderboard rows, already sorted best-first; names resolved by the data layer. */
  rows: LeaderRow[]
}

/** Server-safe: static top-5 table with no client interactivity. */
export default function Leaderboard({ rows }: LeaderboardProps) {
  const top = rows.slice(0, 5)
  const short = (name: string) =>
    name.split(' ').length > 1 ? `${name.split(' ')[0]} ${name.split(' ').at(-1)![0]}.` : name

  return (
    <div className="rounded-2xl border border-[#e3ebf2] bg-white p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <p className="text-[15px] font-semibold text-[#0b2a4a]">Team leaderboard</p>
        <a className="text-[13px] font-medium text-[#0f7f7f] no-underline" href="#">
          View all
        </a>
      </div>
      <ol className="flex flex-col gap-1.5">
        {top.map((teamRow, index) => (
          <li
            key={teamRow.id}
            className={`flex items-center gap-3 rounded-[10px] px-2 py-1.5 ${teamRow.id === 'me' ? 'bg-[#eef7f6]' : ''}`}
          >
            <span className="tnum flex h-6 w-7 shrink-0 items-center justify-center rounded-xl bg-[#eef0fb] text-[12px] font-semibold text-[#4338ca]">
              {index + 1}
            </span>
            <Avatar id={teamRow.id} size={32} />
            <span className="min-w-0 flex-1 truncate text-[14px] text-[#0b2a4a]">
              {short(teamRow.name)}
              {teamRow.id === 'me' && (
                <span className="ml-1 rounded-full bg-[#e6f6f4] px-2 py-0.5 align-middle text-[11px] font-semibold text-[#0b6e68]">
                  You
                </span>
              )}
            </span>
            <b className="tnum text-[14px] text-[#0b2a4a]">{fmtNum(teamRow.pts)}</b>
          </li>
        ))}
      </ol>
    </div>
  )
}

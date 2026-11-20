import { Link, Navigate } from 'react-router-dom'
import { CalendarClock, Trophy, Users } from 'lucide-react'
import { getMe, getAwardsCycle } from '@/lib/data-api'
import { usePageData } from '@/hooks/use-page-data'
import { usePageTitle } from '@/hooks/use-page-title'
import { ErrorState, LoadingSkeleton } from '../load-ui'

/** Award cycle — the leadership/admin view of the live quarterly cycle:
 *  the real cycle clock from GET /awards/showcase, plus the two working
 *  lanes (nominations, approvals). Employees work through /recognize and
 *  never land here. */
export default function AwardsCyclePage() {
  usePageTitle('Award cycle')
  const me = usePageData(getMe, [])
  const cycle = usePageData(getAwardsCycle, [])

  if (me.isLoading || cycle.isLoading) return <LoadingSkeleton label="Loading the award cycle…" />
  if (me.error) return <ErrorState error={me.error} />
  if (cycle.error) return <ErrorState error={cycle.error} />

  // The tab only exists for leaders and admins; deep links from elsewhere bounce.
  if (me.data && me.data.persona === 'employee') return <Navigate to="/" replace />
  if (!cycle.data || !me.data) return null

  const { days_to_nominations_close, open_categories, cycle_prize_total, my_jury } = cycle.data

  const tiles = [
    {
      icon: CalendarClock,
      tint: 'bg-[#fdf5e3] text-[#b8860b]',
      value: days_to_nominations_close === null ? 'Closed' : `${days_to_nominations_close} days`,
      label: days_to_nominations_close === null ? 'Nominations closed' : 'Until nominations close',
    },
    {
      icon: Trophy,
      tint: 'bg-[#e6f6f4] text-[#0b6e68]',
      value: String(open_categories),
      label: 'Open categories',
    },
    {
      icon: Users,
      tint: 'bg-[#eef2fb] text-[#35506b]',
      value: `${cycle_prize_total.toLocaleString()} pts`,
      label: 'Cycle prize pot',
    },
  ]

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 pt-1 pb-6 lg:px-8">
      <div>
        <h1 className="text-[22px] font-extrabold text-[#0b2a4a]">Award cycle</h1>
        <p className="mt-0.5 text-[13.5px] text-[#55697d]">
          The live quarterly cycle — clock, categories, and the lanes you work.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-2xl border border-[#e3ebf2] bg-white p-5">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tile.tint}`}>
              <tile.icon size={18} aria-hidden />
            </span>
            <p className="tnum mt-3 text-[24px] font-black leading-none text-[#0b2a4a]">{tile.value}</p>
            <p className="mt-1.5 text-[13px] text-[#55697d]">{tile.label}</p>
          </div>
        ))}
      </div>

      {my_jury.assigned && (
        <div
          className={`flex items-center justify-between gap-4 rounded-2xl p-5 ${
            my_jury.cast ? 'border border-[#bfe8cf] bg-[#e9faf1]' : 'border border-[#f5b324] bg-[#fdf5e3]'
          }`}
        >
          <p className="text-[14px] font-semibold text-[#0b2a4a]">
            {my_jury.cast
              ? "You're on the jury for this cycle — thanks, your votes are in."
              : "You're on the jury for this cycle — your votes are still open."}
          </p>
          {!my_jury.cast && (
            <Link
              to="/approvals"
              className="shrink-0 rounded-xl bg-[#153B5A] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:brightness-110"
            >
              Review nominations
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/recognize"
          className="group flex items-center gap-4 rounded-2xl border border-[#e3ebf2] bg-white p-5 transition hover:border-[#f5b324]"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fdf5e3] text-[#b8860b]">
            <Trophy size={20} aria-hidden />
          </span>
          <span>
            <span className="block text-[15px] font-bold text-[#0b2a4a]">Nominate a teammate</span>
            <span className="block text-[13px] text-[#55697d]">Send an award nomination while the cycle is open</span>
          </span>
        </Link>
        <Link
          to="/approvals"
          className="group flex items-center gap-4 rounded-2xl border border-[#e3ebf2] bg-white p-5 transition hover:border-[#f5b324]"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef2fb] text-[#35506b]">
            <Users size={20} aria-hidden />
          </span>
          <span>
            <span className="block text-[15px] font-bold text-[#0b2a4a]">Approvals queue</span>
            <span className="block text-[13px] text-[#55697d]">Nominations and point recognitions awaiting a decision</span>
          </span>
        </Link>
      </div>
    </div>
  )
}

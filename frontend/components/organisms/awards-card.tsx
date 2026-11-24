import { Link } from 'react-router-dom'
import { getAwardsCycle } from '@/lib/data-api'
import { usePageData } from '@/hooks/use-page-data'

/** Navy quarterly-awards call-out — the right rail's closing card, live from
 *  GET /awards/showcase: how many awards are running, the prize pot, and the
 *  nearest nomination end; the button hands off to the Award cycle page. */
export default function AwardsCard() {
  const cycle = usePageData(getAwardsCycle, [])

  if (cycle.isLoading || cycle.error || !cycle.data) return <LoadingCard />

  const { open_categories, cycle_prize_total, days_to_nominations_close } = cycle.data
  const closed = days_to_nominations_close === null
  const note = closed
    ? 'Nominations are closed for this cycle — the next one opens soon.'
    : days_to_nominations_close === 1
      ? 'Nominations close tomorrow — recognize the teammate who shipped and showed up.'
      : `Nominations close in ${days_to_nominations_close} days — recognize the teammate who shipped and showed up.`

  return (
    <div className="rounded-2xl bg-[#141f3a] p-5 text-white">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-[#f5b324] uppercase">Quarterly awards</p>
      <p className="my-2 text-[20px] font-bold leading-[1.3]">
        <span className="tnum text-[#f5b324]">{open_categories}</span> awards live ·{' '}
        <span className="tnum text-[#f5b324]">{cycle_prize_total.toLocaleString()} pts</span> in the pot
      </p>
      <p className="mb-4 text-[13px] leading-[1.5] text-[#b8c3d9]">{note}</p>
      <Link
        to="/awards-cycle"
        className="flex h-11 items-center justify-center rounded-xl bg-[#f5b324] px-5 text-sm font-bold text-[#2a1c00] transition hover:brightness-110"
      >
        Nominate someone
      </Link>
    </div>
  )
}

function LoadingCard() {
  return (
    <div className="animate-pulse rounded-2xl bg-[#141f3a] p-5 text-white">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-[#f5b324] uppercase">Quarterly awards</p>
      <div className="mt-3 h-5 w-[70%] rounded bg-white/15" />
      <div className="mt-2 h-4 w-[90%] rounded bg-white/10" />
      <div className="mt-4 h-11 rounded-xl bg-[#f5b324]/40" />
    </div>
  )
}

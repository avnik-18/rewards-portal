import { Link } from 'react-router-dom'
import { fmtNum } from '@/lib/format'

export interface PointsBalanceCardProps {
  balance: number
}

/** Right-rail wallet card — light gradient with the concentric-arcs art
 *  (quarter rings bottom-left, arcs top-right), mono tracked title, huge
 *  balance digits and the rounded navy CTA bottom-right, as designed. */
export default function PointsBalanceCard({ balance }: PointsBalanceCardProps) {
  return (
    <div className="relative isolate overflow-hidden rounded-2xl bg-[#f4fafb]">
      <div className="absolute -left-16 -bottom-16 -z-0 h-[220px] w-[220px]" aria-hidden>
        <div className="absolute inset-0 rounded-full bg-[#a8dcc7]" />
        <div className="absolute left-4 top-4 h-[188px] w-[188px] rounded-full bg-[#bfe4d6]" />
        <div className="absolute left-8 top-8 h-[156px] w-[156px] rounded-full bg-[#d7edde]" />
        <div className="absolute left-4 top-[92px] h-[44px] w-[44px] rounded-full bg-[#1e5f63]" />
      </div>
      <div className="absolute -right-20 -top-24 -z-0 h-[240px] w-[240px] rounded-full bg-[#cfe4f4]" aria-hidden />
      <div className="absolute -right-8 -top-10 -z-0 h-[160px] w-[160px] rounded-full border-[10px] border-[#ddeefa]" aria-hidden />
      <div className="absolute right-14 bottom-6 -z-0 h-[120px] w-[120px] rounded-full border-[3px] border-[#dbeefb]" aria-hidden />

      <div className="relative z-10 flex h-[230px] flex-col px-5 pb-4 pt-5">
        <p className="text-[11.5px] font-bold font-mono tracking-[0.18em] text-[#17415f] uppercase">
          Total points balance
        </p>
        <p className="tnum mt-1 leading-[1.05] text-[#12324f]">
          <span className="text-[52px] font-black">{fmtNum(balance)}</span>{' '}
          <span className="text-[22px] font-extrabold text-[#0f7f7f]">PTS</span>
        </p>
        <Link
          to="/rewards"
          className="mt-auto flex h-12 w-[210px] items-center justify-center self-end rounded-full bg-[#12324f] text-[15px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(3,13,28,0.6)] transition hover:brightness-110"
        >
          Go to My Rewards
        </Link>
      </div>
    </div>
  )
}

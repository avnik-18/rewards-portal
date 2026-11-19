import { Link } from 'react-router-dom'
import { fmtNum } from '@/lib/format'

export interface PointsBalanceCardProps {
  balance: number
}

/** Right-rail wallet card — mint gradient with the full-width navy CTA. */
export default function PointsBalanceCard({ balance }: PointsBalanceCardProps) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #e6f7f3, #dcecf9)' }}>
      <p className="text-[11px] font-semibold tracking-[0.14em] text-[#0f7f7f] uppercase">Total points balance</p>
      <p className="mt-1.5 mb-3.5 text-[40px] font-extrabold leading-[1.15] text-[#0b2a4a] tnum">
        {fmtNum(balance)} <span className="text-[16px] font-normal text-[#0f7f7f]">PTS</span>
      </p>
      <Link
        to="/rewards"
        className="flex h-11 w-full items-center justify-center rounded-xl bg-[#0b2a4a] text-sm font-semibold text-white transition hover:brightness-110"
      >
        Go to My Rewards
      </Link>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { fmtNum } from '@/lib/format'

export interface PointsBalanceCardProps {
  balance: number
}

/** The My-Rewards balance tile, verbatim: same gradient, same concentric
 *  circles art, same type scale — the rail CTA targets /rewards instead of
 *  the in-page ledger. */
export default function PointsBalanceCard({ balance }: PointsBalanceCardProps) {
  return (
    <div className="relative min-h-[220px] overflow-hidden rounded-[28px] border border-[#C9E4F2] bg-[linear-gradient(115deg,#E2F7F1_0%,#EAF9FB_45%,#DDEFFA_100%)]">
      <span
        aria-hidden
        className="pointer-events-none absolute rounded-full bg-[#DDF3EA]"
        style={{ width: 480, height: 480, left: -240, bottom: -240 }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute rounded-full bg-[#7ECDBE]/55"
        style={{ width: 380, height: 380, left: -190, bottom: -190 }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute rounded-full border-2 border-[#0B2740]/10"
        style={{ width: 320, height: 320, left: -160, bottom: -160 }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute rounded-full bg-[#164D61]"
        style={{ width: 240, height: 240, left: -120, bottom: -120 }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute rounded-full bg-[#8CC7E7]/30"
        style={{ width: 360, height: 360, right: -180, top: -180 }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute rounded-full bg-[#B7DFF1]/45"
        style={{ width: 260, height: 260, right: -130, top: -130 }}
      />

      <div className="relative z-10 flex h-full min-h-[220px] flex-col justify-between p-7">
        <p className="text-[clamp(0.7rem,1vw,0.8rem)] font-medium uppercase tracking-[4px] text-[#0B2740]/85">
          Total reward balance
        </p>
        <div className="flex items-end justify-center gap-3">
          <p className="tnum text-[clamp(2.4rem,4.6vw,3.8rem)] font-black leading-[0.9] tracking-[-0.04em] text-[#0B2740]">
            {fmtNum(balance)}
          </p>
          <p className="mb-2 text-[clamp(1.05rem,1.8vw,1.5rem)] font-extrabold tracking-tight text-[#0E7C8C]">PTS</p>
        </div>
        <div className="flex justify-end">
          <Link
            to="/rewards"
            className="flex items-center justify-center rounded-xl bg-[#153B5A] px-6 py-3 text-[13.5px] font-semibold text-white transition hover:brightness-110"
          >
            Go to My Rewards
          </Link>
        </div>
      </div>
    </div>
  )
}

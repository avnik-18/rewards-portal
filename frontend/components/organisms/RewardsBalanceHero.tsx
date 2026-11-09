import { ArrowRight } from 'lucide-react'
import { fmtNum } from '@/lib/format'
import { useCountUp } from '@/lib/use-count-up'
import type { RewardSummary } from '@/lib/data-api'

export interface RewardsBalanceHeroProps {
  summary: RewardSummary
}

/** Animated balance tile + lifetime breakdown card. Client island (count-up). */
export default function RewardsBalanceHero({ summary }: RewardsBalanceHeroProps) {
  const n = useCountUp(summary.balance)

  const scrollToLedger = () => document.getElementById('ledger')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="mb-8 grid gap-4 md:grid-cols-3">
      <div className="relative min-h-[220px] overflow-hidden rounded-[28px] border border-[#C9E4F2] bg-[linear-gradient(115deg,#E2F7F1_0%,#EAF9FB_45%,#DDEFFA_100%)] md:col-span-2">
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
            <p className="tnum text-[clamp(2.8rem,6.6vw,4.7rem)] font-black leading-[0.9] tracking-[-0.04em] text-[#0B2740]">
              {fmtNum(n)}
            </p>
            <p className="mb-2 text-[clamp(1.1rem,1.9vw,1.6rem)] font-extrabold tracking-tight text-[#0E7C8C]">PTS</p>
          </div>
          <div className="flex justify-end pr-1 sm:pr-4">
            <button
              onClick={scrollToLedger}
              className="flex items-center gap-3 rounded-xl bg-[#153B5A] px-7 py-3 text-[13.5px] font-semibold text-white transition hover:brightness-110"
            >
              View ledger <ArrowRight size={15} aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-line bg-white p-5">
        <p className="text-[10.5px] font-extrabold font-mono uppercase tracking-[0.14em] text-muted">Earned lifetime</p>
        <p className="tnum mt-2 text-[28px] font-extrabold leading-none text-navy">{fmtNum(summary.earnedLifetime)}</p>
        <div className="mt-3.5 space-y-1.5">
          <p className="flex items-center justify-between text-[12.5px] font-semibold text-muted">
            <span>Awards</span>
            <span className="tnum font-extrabold text-navy">{fmtNum(summary.breakdown.awards)}</span>
          </p>
          <p className="flex items-center justify-between text-[12.5px] font-semibold text-muted">
            <span>Grants &amp; kudos</span>
            <span className="tnum font-extrabold text-navy">{fmtNum(summary.breakdown.grants)}</span>
          </p>
          <p className="flex items-center justify-between text-[12.5px] font-semibold text-muted">
            <span>Milestones</span>
            <span className="tnum font-extrabold text-navy">{fmtNum(summary.breakdown.milestones)}</span>
          </p>
        </div>
      </div>
    </div>
  )
}

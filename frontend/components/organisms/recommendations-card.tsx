import { ArrowRight } from 'lucide-react'

/** Demo suggestions (no lane yet) — recognition ideas the portal nudge-cache
 *  would surface in the future: milestones, spotlights, name-days. */
const RECOMMENDATIONS = [
  'Priya Rao shipped the data-quality dashboard — her one-year work anniversary is due.',
  'Daniel Cho — the LLQ eval harness halved release validation. Worth a spotlight.',
  'Anita Guha joined 7 days ago — her buddy kudos is still pending.',
]

/** Recognition ideas rail card, in the My-Rewards card language: deep navy
 *  gradient, dot texture, gold mono heading with a rule, muted gold bullets. */
export default function RecommendationsCard() {
  return (
    <div
      className="dotgrid overflow-hidden rounded-2xl text-white shadow-[0_14px_34px_-18px_rgba(3,13,28,0.55)]"
      style={{ background: 'linear-gradient(135deg, #0d3a3f 0%, #0d4f56 55%, #092a30 100%)' }}
    >
      <a href="#" className="block px-5 pb-4 pt-4 no-underline" aria-label="Recommendations">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-gold" aria-hidden>
              ◆
            </span>
            <p className="text-[11.5px] font-bold font-mono uppercase tracking-[0.14em] text-[#e9f6f5]">
              Recommendations
            </p>
          </div>
          <ArrowRight size={18} className="text-gold transition-transform hover:translate-x-0.5" />
        </div>
        <div className="mt-2 w-10 border-t-2 border-gold" aria-hidden />
        <ul className="mt-3 flex flex-col gap-2.5">
          {RECOMMENDATIONS.map((line) => (
            <li key={line} className="flex items-start gap-2 text-[13px] leading-snug text-white/80">
              <span className="mt-1.5 text-[7px] text-gold" aria-hidden>
                ◆
              </span>
              <span className="truncate">{line}</span>
            </li>
          ))}
        </ul>
      </a>
    </div>
  )
}

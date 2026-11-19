import { ArrowRight } from 'lucide-react'

/** Demo suggestions (no lane yet) — recognition ideas the portal nudge-cache
 *  would surface in the future: milestones, spotlights, name-days. */
const RECOMMENDATIONS = [
  'Priya Rao shipped the data-quality dashboard — her one-year work anniversary is due.',
  'Daniel Cho — the LLQ eval harness halved release validation. Worth a spotlight.',
  'Anita Guha joined 7 days ago — her buddy kudos is still pending.',
]

/** Recognition ideas rail card, styled like the leaderboard/celebrations
 *  cards: bordered white panel, title with an arrow affordance, muted rows. */
export default function RecommendationsCard() {
  return (
    <div className="rounded-2xl border border-[#e3ebf2] bg-white">
      <a href="#" className="flex items-center justify-between px-5 pb-1 pt-4 no-underline" aria-label="Recommendations">
        <p className="text-[15.5px] font-bold text-[#0b2a4a]">Recommendations</p>
        <ArrowRight size={18} className="text-[#0b2a4a] transition-transform hover:translate-x-0.5" />
      </a>
      <ul className="flex flex-col px-5 pb-4 pt-1.5">
        {RECOMMENDATIONS.map((line) => (
          <li key={line} className="truncate py-1 text-[13.5px] text-[#55697d]">
            {line}
          </li>
        ))}
      </ul>
    </div>
  )
}

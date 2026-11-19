import { ArrowRight } from 'lucide-react'

export interface RecommendationsCardProps {
  className?: string
}

/** Demo suggestions (no lane yet) — recognition ideas the portal nudge-cache
 *  would surface in the future: milestones, spotlights, name-days.
 *  Uses the deep-navy milestone stat tile exactly: same .stat-panel
 *  .stat-milestone surfaces, same ring/diamond/triangle motifs, same
 *  sky-300 mono heading with the chip and rule. */
export default function RecommendationsCard({ className = '' }: RecommendationsCardProps) {
  const RECOMMENDATIONS = [
    'Priya Rao shipped the data-quality dashboard — her one-year work anniversary is due.',
    'Daniel Cho — the LLQ eval harness halved release validation. Worth a spotlight.',
    'Anita Guha joined 7 days ago — her buddy kudos is still pending.',
  ]

  return (
    <div className={`stat-panel stat-milestone stat-tile relative overflow-hidden p-5 ${className}`}>
      <span
        aria-hidden
        className="stat-ring -right-28 -top-20 h-72 w-72"
        style={{ borderColor: 'rgba(147, 197, 253, 0.25)' }}
      />
      <span
        aria-hidden
        className="stat-ring -right-8 -bottom-24 h-64 w-64"
        style={{ borderColor: 'rgba(147, 197, 253, 0.3)' }}
      />
      <span
        aria-hidden
        className="stat-shape stat-diamond pointer-events-none absolute right-1/3 bottom-2 h-9 w-9 border-2 border-sky-400/30 bg-sky-400/10"
      />
      <span
        aria-hidden
        className="stat-shape stat-triangle pointer-events-none absolute right-40 bottom-2 border-b-[26px] border-l-[16px] border-r-[16px] border-b-sky-300/25 border-l-transparent border-r-transparent"
      />
      <span
        aria-hidden
        className="stat-shape stat-triangle pointer-events-none absolute left-6 top-2 border-b-[16px] border-l-[10px] border-r-[10px] border-b-sky-300/15 border-l-transparent border-r-transparent"
      />
      <span
        aria-hidden
        className="stat-shape stat-diamond pointer-events-none absolute left-5 bottom-4 h-5 w-5 bg-sky-400/10"
      />

      <a href="#" className="relative z-10 block no-underline" aria-label="Recommendations">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-400/20 text-sky-300">
            <ArrowRight size={17} />
          </span>
          <span>
            <span className="block text-[10.5px] font-extrabold font-mono uppercase tracking-[0.2em] text-sky-300">
              Recommendations
            </span>
            <span className="mt-1 block h-px w-10 bg-sky-400/60" />
          </span>
        </div>
        <ul className="mt-3.5 flex flex-col gap-2.5">
          {RECOMMENDATIONS.map((line) => (
            <li key={line} className="flex items-start gap-2 text-[12.5px] leading-snug text-white/85">
              <span className="stat-shape stat-diamond mt-1.5 h-2 w-2 bg-sky-300/60" aria-hidden />
              <span className="truncate">{line}</span>
            </li>
          ))}
        </ul>
      </a>
    </div>
  )
}

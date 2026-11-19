import { ArrowRight } from 'lucide-react'

export interface RecommendationsCardProps {
  className?: string
}

/** Demo suggestions (no lane yet) — recognition ideas the portal nudge-cache
 *  would surface in the future: milestones, spotlights, name-days.
 *  Uses the TEAL stat panel (the given/received family): same .stat-panel
 *  surface, cyan ring/diamond/triangle motifs, cyan-300 mono heading. */
export default function RecommendationsCard({ className = '' }: RecommendationsCardProps) {
  const RECOMMENDATIONS = [
    'Priya Rao shipped the data-quality dashboard — her one-year work anniversary is due.',
    'Daniel Cho — the LLQ eval harness halved release validation. Worth a spotlight.',
    'Anita Guha joined 7 days ago — her buddy kudos is still pending.',
  ]

  return (
    <div className={`stat-panel stat-tile relative overflow-hidden p-5 ${className}`}>
      <span aria-hidden className="stat-ring -right-28 -top-20 h-72 w-72" />
      <span
        aria-hidden
        className="stat-ring -right-6 bottom-6 h-40 w-40"
        style={{ borderColor: 'rgba(103,222,222,0.35)' }}
      />
      <span
        aria-hidden
        className="stat-shape stat-diamond pointer-events-none absolute right-1/3 bottom-2 h-7 w-7 border-2 border-cyan-300/30 bg-cyan-300/10"
      />
      <span
        aria-hidden
        className="stat-shape stat-triangle pointer-events-none absolute right-[38%] top-1/2 border-b-[22px] border-l-[14px] border-r-[14px] border-b-cyan-300/25 border-l-transparent border-r-transparent"
      />
      <span
        aria-hidden
        className="stat-shape stat-diamond pointer-events-none absolute left-6 bottom-3 h-5 w-5 bg-cyan-300/10"
      />
      <span
        aria-hidden
        className="stat-shape stat-triangle pointer-events-none absolute left-10 top-3 border-b-[16px] border-l-[10px] border-r-[10px] border-b-cyan-300/15 border-l-transparent border-r-transparent"
      />

      <a href="#" className="relative z-10 block no-underline" aria-label="Recommendations">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/20 text-cyan-300">
            <ArrowRight size={17} />
          </span>
          <span>
            <span className="block text-[10.5px] font-extrabold font-mono uppercase tracking-[0.2em] text-cyan-300">
              Recommendations
            </span>
            <span className="mt-1 block h-px w-10 bg-cyan-300/80" />
          </span>
        </div>
        <ul className="mt-3.5 flex flex-col gap-2.5">
          {RECOMMENDATIONS.map((line) => (
            <li key={line} className="flex items-start gap-2 text-[12.5px] leading-snug text-white/85">
              <span className="stat-shape stat-diamond mt-1.5 h-2 w-2 bg-cyan-300/60" aria-hidden />
              <span className="truncate">{line}</span>
            </li>
          ))}
        </ul>
      </a>
    </div>
  )
}

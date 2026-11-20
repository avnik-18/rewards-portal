import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { Celebration } from '@/lib/data-api'

export interface UpcomingEventsCardProps {
  events: Celebration[]
  className?: string
}

const EVENT_LABEL: Record<Celebration['kind'], string> = {
  birthday: 'Birthday',
  anniversary: 'Work Anniversary',
  event: 'Event',
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Clean date chip: Today / Tomorrow / "Nov 25". */
export function eventDate(event: Celebration): string {
  if (event.days_until === 0) return 'Today'
  if (event.days_until === 1) return 'Tomorrow'
  const parts = event.event_at.split('-')
  return `${MONTHS[Number(parts[1]) - 1]} ${Number(parts[2])}`
}

/** The rail's single upcoming-events tile: the caller's relevant people's
 *  birthdays and anniversaries plus org-wide admin-posted events, all
 *  inside one scroll. "View now" opens the full page. TEAL stat panel —
 *  same .stat-panel surface, cyan ring/diamond/triangle motifs. */
export default function UpcomingEventsCard({ events, className = '' }: UpcomingEventsCardProps) {
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

      <div className="relative z-10 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/20 text-cyan-300">
          <ArrowRight size={17} />
        </span>
        <span>
          <span className="block text-[10.5px] font-extrabold font-mono uppercase tracking-[0.2em] text-cyan-300">
            Upcoming events
          </span>
          <span className="mt-1 block h-px w-10 bg-cyan-300/80" />
        </span>
        <Link
          to="/upcoming-events"
          className="ml-auto self-start text-[12.5px] font-semibold text-cyan-300 no-underline transition hover:brightness-110"
        >
          View now
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="relative z-10 mt-4 text-[12.5px] text-white/70">Nothing coming up in your circle.</p>
      ) : (
        <div className="relative z-10 mt-3.5 flex max-h-[228px] flex-col gap-2.5 overflow-y-auto pr-1">
          {events.map((event) => (
            <div key={`${event.kind}-${event.full_name}-${event.event_at}`} className="flex items-center gap-2">
              <span className="stat-shape stat-diamond h-2 w-2 shrink-0 bg-cyan-300/60" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-[12.5px] leading-snug text-white/85">
                {event.full_name} - {EVENT_LABEL[event.kind]}
                {event.days_until === 0 && ' (today)'}
              </span>
              <span className="tnum shrink-0 rounded-md bg-cyan-300/15 px-1.5 py-0.5 text-[11px] font-bold text-cyan-200">
                {eventDate(event)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

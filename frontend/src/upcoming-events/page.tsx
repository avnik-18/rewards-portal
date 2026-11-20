import { useState } from 'react'
import { Avatar } from '@/components/atoms'
import { eventDate } from '@/components/organisms/upcoming-events-card'
import { getCelebrations, type Celebration } from '@/lib/data-api'
import { usePageData } from '@/hooks/use-page-data'
import { usePageTitle } from '@/hooks/use-page-title'
import { ErrorState, LoadingSkeleton } from '../load-ui'

const EVENT_LABEL: Record<Celebration['kind'], string> = {
  birthday: 'Birthday',
  anniversary: 'Work Anniversary',
  event: 'Event',
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function fullDate(event: Celebration): string {
  const parts = event.event_at.split('-')
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]
  return `${weekday}, ${MONTHS[date.getMonth()]} ${date.getDate()}`
}

/** Upcoming events — the complete list behind the rail tile: everyone's
 *  upcoming birthdays, work anniversaries, and admin-posted events, with
 *  the Congratulate hand-off (the flow itself is still in implementation). */
export default function UpcomingEventsPage() {
  usePageTitle('Upcoming events')
  const { data: events, error, isLoading } = usePageData(getCelebrations, [])
  const [congratsOpen, setCongratsOpen] = useState<Celebration | null>(null)

  if (isLoading) return <LoadingSkeleton label="Loading upcoming events…" />
  if (error) return <ErrorState error={error} />
  if (!events) return null

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 pt-1 pb-6 lg:px-8">
      <div>
        <h1 className="text-[22px] font-extrabold text-[#0b2a4a]">Upcoming events</h1>
        <p className="mt-0.5 text-[13.5px] text-[#55697d]">
          Birthdays, work anniversaries, and org-wide events over the next 30 days.
        </p>
      </div>

      {events.length === 0 ? (
        <p className="rounded-2xl border border-[#e3ebf2] bg-white p-8 text-center text-[14px] text-[#55697d]">
          Nothing coming up in your circle.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#e3ebf2] bg-white">
          {events.map((event) => (
            <div
              key={`${event.kind}-${event.full_name}-${event.event_at}`}
              className="flex items-center gap-4 border-b border-[#eef3f7] px-5 py-3 last:border-0"
            >
              {event.kind === 'event' ? (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fdf5e3] text-lg" aria-hidden>
                  🎉
                </span>
              ) : (
                <Avatar id={event.employee_code ?? event.full_name} name={event.full_name} size={40} />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-semibold text-[#0b2a4a]">
                  {event.kind === 'event' ? event.full_name : `${event.full_name} - ${EVENT_LABEL[event.kind]}`}
                </p>
                {event.detail && <p className="truncate text-[12.5px] text-[#55697d]">{event.detail}</p>}
              </div>
              <span
                className={`tnum shrink-0 rounded-full px-3 py-1 text-[12px] font-bold ${
                  event.days_until <= 1
                    ? 'bg-[#e9faf1] text-[#0d8a4b]'
                    : 'bg-[#f1f5f9] text-[#35506b]'
                }`}
              >
                {eventDate(event)} · {fullDate(event)}
              </span>
              {event.kind !== 'event' && (
                <button
                  type="button"
                  onClick={() => setCongratsOpen(event)}
                  className="shrink-0 rounded-xl bg-[#153B5A] px-4 py-2 text-[12.5px] font-semibold text-white transition hover:brightness-110"
                >
                  Congratulate
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {congratsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b2a4a]/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Congratulate"
          onClick={() => setCongratsOpen(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl"
            onClick={(mouseEvent) => mouseEvent.stopPropagation()}
          >
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fdf5e3] text-2xl" aria-hidden>
              🎊
            </span>
            <p className="mt-3 text-[17px] font-extrabold text-[#0b2a4a]">Congrats!</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#55697d]">
              The congrats flow is still in implementation — {congratsOpen.full_name.split(' ')[0]} will get a
              proper shout-out once it ships.
            </p>
            <button
              type="button"
              onClick={() => setCongratsOpen(null)}
              className="mt-4 w-full rounded-xl bg-[#153B5A] py-2.5 text-[13.5px] font-semibold text-white transition hover:brightness-110"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

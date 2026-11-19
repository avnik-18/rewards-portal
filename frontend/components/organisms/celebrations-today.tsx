import { Avatar } from '../atoms'
import { person } from '@/lib/data-api'
import type { Celebration } from '@/lib/data-api'

export interface CelebrationsTodayProps {
  items: Celebration[]
}

const PARTY = '🎂'

/** Avatar trio of today's birthdays / anniversaries, in the milestone stat
 *  tile surface: deep navy gradient, ring/diamond motifs, sky mono heading
 *  with the chip and rule — the same card the Recommendations card uses. */
export default function CelebrationsToday({ items }: CelebrationsTodayProps) {
  return (
    <div className="stat-panel stat-milestone stat-tile relative overflow-hidden p-5">
      <span
        aria-hidden
        className="stat-ring -left-24 -bottom-24 h-64 w-64"
        style={{ borderColor: 'rgba(147, 197, 253, 0.25)' }}
      />
      <span aria-hidden className="stat-ring -right-20 -top-24 h-64 w-64" />
      <span
        aria-hidden
        className="stat-shape stat-diamond pointer-events-none absolute right-6 bottom-3 h-5 w-5 bg-sky-400/10"
      />
      <span
        aria-hidden
        className="stat-shape stat-triangle pointer-events-none absolute right-1/3 bottom-2 border-b-[20px] border-l-[12px] border-r-[12px] border-b-sky-300/20 border-l-transparent border-r-transparent"
      />

      <div className="relative z-10 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-400/20 text-lg" aria-hidden>
          {PARTY}
        </span>
        <span>
          <span className="block text-[10.5px] font-extrabold font-mono uppercase tracking-[0.2em] text-sky-300">
            Celebrations today
          </span>
          <span className="mt-1 block h-px w-10 bg-sky-400/60" />
        </span>
        <a
          href="#"
          className="ml-auto self-start text-[12.5px] font-semibold text-sky-300 no-underline transition hover:brightness-110"
        >
          View all
        </a>
      </div>

      {items.length === 0 ? (
        <p className="relative z-10 mt-4 text-[13px] text-white/70">No celebrations today.</p>
      ) : (
        <div className="relative z-10 mt-4 grid grid-cols-3 gap-2 text-center">
          {items.map((item) => {
            const profile = person(item.id)
            return (
              <div key={item.id} title={item.detail}>
                <div className="mx-auto mb-1.5 w-fit">
                  <Avatar id={item.id} size={40} />
                </div>
                <p className="text-[13px] font-medium text-white/85">
                  {profile ? profile.name.split(' ')[0] : '—'}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

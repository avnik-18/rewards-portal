import { Avatar } from '../atoms'
import { person } from '@/lib/data-api'
import type { Celebration } from '@/lib/data-api'

export interface CelebrationsTodayProps {
  items: Celebration[]
}

/** Avatar trio of today's birthdays / anniversaries under the leaderboard. */
export default function CelebrationsToday({ items }: CelebrationsTodayProps) {
  return (
    <div className="rounded-2xl border border-[#e3ebf2] bg-white p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <p className="text-[15px] font-semibold text-[#0b2a4a]">Celebrations today</p>
        <a className="text-[13px] font-medium text-[#0f7f7f] no-underline" href="#">
          View all
        </a>
      </div>
      {items.length === 0 ? (
        <p className="text-[13px] text-[#55697d]">No celebrations today.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 text-center">
          {items.map((item) => {
            const profile = person(item.id)
            return (
              <div key={item.id} title={item.detail}>
                <div className="mx-auto mb-1.5 w-fit">
                  <Avatar id={item.id} size={40} />
                </div>
                <p className="text-[13px] text-[#55697d]">{profile ? profile.name.split(' ')[0] : '—'}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

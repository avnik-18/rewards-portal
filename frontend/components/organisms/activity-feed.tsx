import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Avatar } from '../atoms'
import { fmtNum } from '@/lib/format'
import { person, personDisplayName, CORE_VALUES } from '@/lib/data-api'
import type { Post } from '@/lib/data-api'

export interface ActivityFeedProps {
  posts: Post[]
}

const TABS = ['All', 'Recognitions', 'Team', 'Celebrations'] as const
type Tab = (typeof TABS)[number]

/** Per-post verb: the feed reads as a sentence, so each kind names its action. */
const VERB: Record<Post['kind'], string> = {
  praise: 'recognized',
  award: 'awarded',
  milestone: 'celebrated',
  welcome: 'welcomed',
}

export default function ActivityFeed({ posts }: ActivityFeedProps) {
  const [tab, setTab] = useState<Tab>('All')

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-extrabold text-[#0b2a4a]">Feed</h2>
        <label className="flex items-center gap-1.5 text-[13px] text-[#55697d]">
          Filter :
          <span className="relative flex items-center gap-1 font-bold text-[#0b2a4a]">
            <select
              aria-label="Feed filter"
              value={tab}
              onChange={(event) => setTab(event.target.value as Tab)}
              className="cursor-pointer appearance-none bg-transparent pr-4 text-[13px] font-bold text-[#0b2a4a] outline-none"
            >
              {TABS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} aria-hidden className="pointer-events-none absolute right-0" />
          </span>
        </label>
      </div>

      {tab === 'All' ? (
        <div className="flex flex-col gap-4">
          {posts.map((post) => {
            const from = person(post.fromId)
            const toName = personDisplayName(post.toIds[0])
            const valueTag =
              post.kind === 'award' ? post.awardLabel : post.valueKey ? CORE_VALUES[post.valueKey].label : undefined
            return (
              <article key={post.id} className="flex flex-col gap-3.5 rounded-2xl border border-[#e3ebf2] bg-white p-5">
                <div className="flex items-start gap-3">
                  <Avatar id={post.fromId} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-[#0b2a4a]">
                      {from?.name ?? 'Someone'} <span className="font-normal text-[#55697d]">{VERB[post.kind]}</span>{' '}
                      {toName}
                    </p>
                    <p className="text-[13px] text-[#55697d]">{post.when}</p>
                  </div>
                  {post.points !== undefined && (
                    <span className="shrink-0 rounded-full bg-[#e6f6f4] px-2.5 py-1 text-xs font-semibold text-[#0b6e68]">
                      +{fmtNum(post.points)} pts
                    </span>
                  )}
                </div>
                <p className="text-[15px] leading-[1.55] text-[#0b2a4a]">{post.message}</p>
                {valueTag && (
                  <div>
                    <span className="inline-block rounded-lg bg-[#f1f5f9] px-2.5 py-[5px] text-xs font-medium text-[#35506b]">
                      {valueTag}
                    </span>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#e3ebf2] bg-white p-8 text-center">
          <p className="text-[15px] font-semibold text-[#0b2a4a]">Nothing here yet</p>
          <p className="mt-1 text-[13px] text-[#55697d]">{tab} items will show up in this feed.</p>
        </div>
      )}
    </div>
  )
}

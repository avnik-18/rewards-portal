import { useState } from 'react'
import { Avatar } from '../atoms'
import { fmtNum } from '@/lib/format'
import { person, personDisplayName, CORE_VALUES } from '@/lib/data-api'
import type { Post } from '@/lib/data-api'

export interface ActivityFeedProps {
  posts: Post[]
}

const TABS = ['All', 'Recognitions', 'Team', 'Celebrations', 'Polls'] as const
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
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Feed filters">
        {TABS.map((name) => (
          <button
            key={name}
            role="tab"
            aria-selected={tab === name}
            onClick={() => setTab(name)}
            className={`min-h-10 cursor-pointer rounded-full border px-4 text-[13px] font-medium transition ${
              tab === name
                ? 'border-[#0b2a4a] bg-[#0b2a4a] text-white'
                : 'border-[#d5e1ea] bg-white text-[#35506b] hover:bg-[#eef5f8]'
            }`}
          >
            {name}
          </button>
        ))}
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
                <div className="mt-0.5 grid grid-cols-4 gap-1 border-t border-[#edf2f6] pt-1.5">
                  {['Like', 'Comment', 'Celebrate', 'Share'].map((label) => (
                    <button
                      key={label}
                      type="button"
                      className="min-h-11 cursor-pointer rounded-[10px] border-0 bg-transparent px-0 text-sm font-medium text-[#35506b] transition hover:bg-[#eef5f8]"
                    >
                      {label}
                    </button>
                  ))}
                </div>
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

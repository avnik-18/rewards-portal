import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Avatar } from '../atoms'
import { fmtNum } from '@/lib/format'
import type { FeedPost } from '@/lib/data-api'

export interface ActivityFeedProps {
  posts: FeedPost[]
}

const TABS = ['All', 'Recognitions', 'Team', 'Celebrations', 'Polls'] as const
type Tab = (typeof TABS)[number]

/** Per-post verb: the feed reads as a sentence, so each kind names its action. */
const VERB: Record<FeedPost['kind'], string> = {
  praise: 'recognized',
  award: 'awarded',
  milestone: 'celebrated',
  welcome: 'welcomed',
}

export default function ActivityFeed({ posts }: ActivityFeedProps) {
  const [tab, setTab] = useState<Tab>('All')
  // Recognitions = praise + award posts; Team/Celebrations/Polls have no
  // backend source yet and stay on the "nothing here" placeholder.
  const visible =
    tab === 'All'
      ? posts
      : tab === 'Recognitions'
        ? posts.filter((post) => post.kind === 'praise' || post.kind === 'award')
        : []

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

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-[#e3ebf2] bg-white p-8 text-center">
          <p className="text-[15px] font-semibold text-[#0b2a4a]">Nothing here yet</p>
          <p className="mt-1 text-[13px] text-[#55697d]">{tab} items will show up in this feed.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((post) => {
            const verb = VERB[post.kind] ?? 'recognized'
            const first = post.recipients[0]
            const extra = post.recipients.length - 1
            return (
              <article key={post.id} className="flex flex-col gap-3.5 rounded-2xl border border-[#e3ebf2] bg-white p-5">
                <div className="flex items-start gap-3">
                  <Avatar id={post.id} name={post.fromName} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-[#0b2a4a]">
                      {post.fromName} <span className="font-normal text-[#55697d]">{verb}</span>{' '}
                      {first?.name ?? 'a teammate'}
                      {extra > 0 && <span className="text-[#55697d]"> +{extra} more</span>}
                    </p>
                    <p className="text-[13px] text-[#55697d]">{post.when}</p>
                  </div>
                  {post.points > 0 && (
                    <span className="shrink-0 rounded-full bg-[#e6f6f4] px-2.5 py-1 text-xs font-semibold text-[#0b6e68]">
                      +{fmtNum(post.points)} pts
                    </span>
                  )}
                </div>
                <p className="text-[15px] leading-[1.55] text-[#0b2a4a]">{post.message}</p>
                {post.valueLabel && (
                  <div>
                    <span className="inline-block rounded-lg bg-[#f1f5f9] px-2.5 py-[5px] text-xs font-medium text-[#35506b]">
                      {post.valueLabel}
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
      )}
    </div>
  )
}

import { useState } from 'react'
import { Avatar, Card, Chip, Segmented, SectionTitle } from '@/components/atoms'
import { CORE_VALUES } from '@/lib/data-api'
import { person } from '@/lib/data-api'
import type { Post } from '@/lib/data-api'

export interface ProfileJourneyProps {
  /** Recognitions this person received, newest first. */
  received: Post[]
  /** Recognitions this person gave, newest first. */
  given: Post[]
}

type Tab = 'received' | 'given'

const TENURE_STEPS = [
  ['Jul 2020', 'Joined emids — Data Engineering'],
  ['Jan 2022', 'Promoted to Engineering Manager'],
  ['Sep 2023', 'First EoQ win — Team Player'],
  ['Jul 2025', '5-year milestone · +500 pts from leadership'],
  ['Now', 'Senior Engineering Manager · pod of 8'],
]

export default function ProfileJourney({ received, given }: ProfileJourneyProps) {
  const [tab, setTab] = useState<Tab>('received')
  const entries = tab === 'received' ? received : given

  return (
    <div className="mt-7">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-extrabold tracking-tight text-navy">Recognition journey</h2>
        <Segmented
          options={[
            { key: 'received', label: `Received ${received.length}` },
            { key: 'given', label: `Given ${given.length}` },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      <div className="space-y-3">
        {entries.map((post) => {
          const otherId = tab === 'received' ? post.fromId : post.toIds[0]
          const other = person(otherId)
          const v = post.valueKey ? CORE_VALUES[post.valueKey] : null
          // Known-data fallback: a post whose directory record is gone still
          // renders, as a quiet placeholder row (sir's review: never dropped)
          if (!other) {
            return (
              <Card key={post.id} className="p-4">
                <p className="text-[12.5px] text-muted">
                  {tab === 'received' ? 'A received recognition' : 'A recognition you gave'} could not be linked to a
                  teammate record.
                </p>
              </Card>
            )
          }
          return (
            <Card key={post.id} className="flex items-center gap-3.5 p-4 transition hover:shadow-lift">
              <Avatar id={other.id} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px]">
                  <span className="font-extrabold text-navy">{other.name}</span>
                  <span className="text-muted">
                    {' '}
                    · {tab === 'received' ? 'praised you' : 'you praised them'} · {post.when}
                  </span>
                </p>
                <p className="mt-0.5 line-clamp-1 text-[12.5px] text-muted">{post.message}</p>
              </div>
              {v && <Chip className={`shrink-0 ${v.soft} ${v.ink}`}>{v.label}</Chip>}
            </Card>
          )
        })}
        {entries.length === 0 && (
          <Card className="p-10 text-center">
            <p className="font-bold text-navy">Nothing here yet</p>
            <p className="mt-1 text-sm text-muted">The journey starts with one recognition.</p>
          </Card>
        )}
      </div>

      {/* Tenure timeline */}
      <div className="mt-8">
        <SectionTitle>Tenure timeline</SectionTitle>
        <Card className="relative p-6">
          <div className="absolute bottom-6 left-[86px] top-6 w-px bg-line" />
          <div className="space-y-5">
            {TENURE_STEPS.map(([when, what], i, arr) => (
              <div key={when + i} className="flex items-start gap-4">
                <div className="w-[70px] shrink-0 pt-0.5 text-right">
                  <p className="text-[11.5px] font-extrabold text-navy">{when}</p>
                </div>
                <span
                  className={`relative z-10 mt-0.5 h-3 w-3 shrink-0 rounded-full border-2 border-white ${i === arr.length - 1 ? 'bg-gold ring-2 ring-gold/30' : 'bg-brand'}`}
                />
                <p className="min-w-0 flex-1 text-[13.5px] font-medium text-ink">{what}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

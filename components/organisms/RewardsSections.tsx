'use client'

import { useState } from 'react'
import { ChevronDown, Trophy } from 'lucide-react'
import { Avatar, Card } from '@/components/atoms'
import LedgerItem from '@/components/molecules/LedgerItem'
import LinkedInShareButton from '@/components/molecules/LinkedInShareButton'
import TemplateCard from '@/components/molecules/TemplateCard'
import { CORE_VALUES, person } from '@/lib/mock-data'
import type { RecognitionReceived, LedgerEntry, ValueLived, EoQAward } from '@/lib/mock-data'

export interface RecognitionsReceivedProps {
  items: RecognitionReceived[]
}

/** Recognitions the viewer has received, newest first. Every recognition starts
 *  as a one-line row with its LinkedIn option; clicking one that used a template
 *  expands the full postcard for sharing. */
export default function RecognitionsReceived({ items }: RecognitionsReceivedProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div>
      <h2 className="mb-3 text-xl font-extrabold tracking-tight text-navy">Recognitions received</h2>
      <div className="space-y-3">
        {items.map((p) =>
          p.artUrl && p.template ? (
            <Card key={p.id} className="overflow-hidden p-0">
              {/* collapsed — the one-line row (Aarav style) */}
              <button
                onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                aria-expanded={expandedId === p.id}
                className="flex w-full items-center gap-3.5 p-4 text-left transition hover:bg-slate-50"
              >
                <Avatar id={p.fromId} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px]">
                    <span className="font-extrabold text-navy">{person(p.fromId).name}</span>
                    <span className="text-muted"> · {p.when}</span>
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-[12.5px] text-muted">{p.message}</p>
                </div>
                {p.value && (
                  <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-[10.5px] font-extrabold text-brand">
                    {p.value}
                  </span>
                )}
                <ChevronDown
                  size={18}
                  aria-hidden
                  className={`shrink-0 text-muted transition-transform duration-200 ${expandedId === p.id ? 'rotate-180 text-brand' : ''}`}
                />
              </button>
              {expandedId === p.id && (
                <>
                  {/* expanded — the full template postcard for the LinkedIn share */}
                  <div className="p-3 pt-0">
                    <TemplateCard
                      tpl={p.template}
                      url={p.artUrl}
                      previewValue={null}
                      recipients={[{ id: 'me', label: 'Ayan' }]}
                      points={p.points ?? 0}
                      msg={p.message}
                    />
                  </div>
                  {p.shareable !== false && (
                    <div className="flex justify-end pb-3 pr-3">
                      <LinkedInShareButton
                        recognitionId={p.id}
                        giver={person(p.fromId).name}
                        message={p.message}
                        valueLabel={p.value}
                        artUrl={p.artUrl}
                      />
                    </div>
                  )}
                </>
              )}
            </Card>
          ) : (
            <Card key={p.id} className="flex items-center gap-3.5 p-4 transition hover:shadow-lift">
              <Avatar id={p.fromId} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px]">
                  <span className="font-extrabold text-navy">{person(p.fromId).name}</span>
                  <span className="text-muted"> · {p.when}</span>
                </p>
                <p className="mt-0.5 line-clamp-1 text-[12.5px] text-muted">{p.message}</p>
              </div>
              {p.value && (
                <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-[10.5px] font-extrabold text-brand">
                  {p.value}
                </span>
              )}
              {p.shareable !== false && (
                <LinkedInShareButton
                  recognitionId={p.id}
                  giver={person(p.fromId).name}
                  message={p.message}
                  valueLabel={p.value}
                />
              )}
            </Card>
          ),
        )}
      </div>
    </div>
  )
}

export interface MyEoQAwardsProps {
  awards: EoQAward[]
}

/** My EoQ nominations — categories with the jury pipeline status pill. */
export function MyEoQAwards({ awards }: MyEoQAwardsProps) {
  return (
    <div>
      <h2 className="mb-3 text-xl font-extrabold tracking-tight text-navy">My EoQ awards</h2>
      <div className="space-y-2.5">
        {awards.map((a) => (
          <Card key={a.id} className="flex items-center gap-3.5 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold-ink">
              <Trophy size={17} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-extrabold text-navy">{a.category}</p>
              <p className="truncate text-[12px] text-muted">nominated {a.nominee} · jury pipeline</p>
            </div>
            {a.status === 'result' ? (
              <span className="tnum shrink-0 rounded-full bg-gold px-3 py-1 text-[11.5px] font-extrabold text-[#3d2b00]">{a.result}</span>
            ) : (
              <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1 text-[11.5px] font-extrabold text-brand-deep">In review</span>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

export interface ValuesYouLiveProps {
  values: ValueLived[]
}

export function ValuesYouLive({ values }: ValuesYouLiveProps) {
  const max = Math.max(...values.map((v) => v.count), 1)
  const sorted = [...values].sort((a, b) => b.count - a.count)
  return (
    <div>
      <h2 className="mb-3 text-xl font-extrabold tracking-tight text-navy">Values you live</h2>
      <Card className="p-5">
        <div className="space-y-3">
          {sorted.map((v) => {
            const core = CORE_VALUES[v.key]
            return (
              <div key={v.key}>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className={`font-bold ${core.ink}`}>{core.label}</span>
                  <span className="tnum font-extrabold text-muted">{v.count}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#E9EEF7]">
                  <div className="h-full rounded-full" style={{ width: `${(v.count / max) * 100}%`, background: core.solid }} />
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

export interface RewardsLedgerProps {
  entries: LedgerEntry[]
}

/** Full points ledger, reads top to bottom, newest first. */
export function RewardsLedger({ entries }: RewardsLedgerProps) {
  return (
    <section id="ledger" className="mt-8 scroll-mt-24">
      <div className="mb-3">
        <h2 className="text-xl font-extrabold tracking-tight text-navy">Points ledger</h2>
      </div>
      <Card className="divide-y divide-line p-0">
        {entries.map((e) => (
          <LedgerItem key={e.id} entry={e} />
        ))}
        {entries.length === 0 && (
          <div className="flex items-center gap-3 px-4 py-8">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-soft text-gold-ink"
              aria-hidden
            >
              <Trophy size={17} />
            </span>
            <p className="text-[13px] text-muted">No ledger entries yet.</p>
          </div>
        )}
      </Card>
    </section>
  )
}

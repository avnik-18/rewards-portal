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
        {items.map((recognition) =>
          recognition.artUrl && recognition.template ? (
            <Card key={recognition.id} className="overflow-hidden p-0">
              {/* collapsed — the one-line row (Aarav style) */}
              <button
                onClick={() => setExpandedId(expandedId === recognition.id ? null : recognition.id)}
                aria-expanded={expandedId === recognition.id}
                className="flex w-full items-center gap-3.5 p-4 text-left transition hover:bg-slate-50"
              >
                <Avatar id={recognition.fromId} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px]">
                    <span className="font-extrabold text-navy">{person(recognition.fromId).name}</span>
                    <span className="text-muted"> · {recognition.when}</span>
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-[12.5px] text-muted">{recognition.message}</p>
                </div>
                {recognition.value && (
                  <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-[10.5px] font-extrabold text-brand">
                    {recognition.value}
                  </span>
                )}
                <ChevronDown
                  size={18}
                  aria-hidden
                  className={`shrink-0 text-muted transition-transform duration-200 ${expandedId === recognition.id ? 'rotate-180 text-brand' : ''}`}
                />
              </button>
              {expandedId === recognition.id && (
                <>
                  {/* expanded — the full template postcard for the LinkedIn share */}
                  <div className="p-3 pt-0">
                    <TemplateCard
                      tpl={recognition.template}
                      url={recognition.artUrl}
                      previewValue={null}
                      recipients={[{ id: 'me', label: 'Ayan' }]}
                      points={recognition.points ?? 0}
                      msg={recognition.message}
                    />
                  </div>
                  {recognition.shareable !== false && (
                    <div className="flex justify-end pb-3 pr-3">
                      <LinkedInShareButton
                        recognitionId={recognition.id}
                        giver={person(recognition.fromId).name}
                        message={recognition.message}
                        valueLabel={recognition.value}
                        artUrl={recognition.artUrl}
                      />
                    </div>
                  )}
                </>
              )}
            </Card>
          ) : (
            <Card key={recognition.id} className="flex items-center gap-3.5 p-4 transition hover:shadow-lift">
              <Avatar id={recognition.fromId} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px]">
                  <span className="font-extrabold text-navy">{person(recognition.fromId).name}</span>
                  <span className="text-muted"> · {recognition.when}</span>
                </p>
                <p className="mt-0.5 line-clamp-1 text-[12.5px] text-muted">{recognition.message}</p>
              </div>
              {recognition.value && (
                <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-[10.5px] font-extrabold text-brand">
                  {recognition.value}
                </span>
              )}
              {recognition.shareable !== false && (
                <LinkedInShareButton
                  recognitionId={recognition.id}
                  giver={person(recognition.fromId).name}
                  message={recognition.message}
                  valueLabel={recognition.value}
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
        {awards.map((award) => (
          <Card key={award.id} className="flex items-center gap-3.5 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold-ink">
              <Trophy size={17} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-extrabold text-navy">{award.category}</p>
              <p className="truncate text-[12px] text-muted">nominated {award.nominee} · jury pipeline</p>
            </div>
            {award.status === 'result' ? (
              <span className="tnum shrink-0 rounded-full bg-gold px-3 py-1 text-[11.5px] font-extrabold text-[#3d2b00]">{award.result}</span>
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
  const max = Math.max(...values.map((lived) => lived.count), 1)
  const sorted = [...values].sort((a, b) => b.count - a.count)
  return (
    <div>
      <h2 className="mb-3 text-xl font-extrabold tracking-tight text-navy">Values you live</h2>
      <Card className="p-5">
        <div className="space-y-3">
          {sorted.map((livedValue) => {
            const core = CORE_VALUES[livedValue.key]
            return (
              <div key={livedValue.key}>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className={`font-bold ${core.ink}`}>{core.label}</span>
                  <span className="tnum font-extrabold text-muted">{livedValue.count}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#E9EEF7]">
                  <div className="h-full rounded-full" style={{ width: `${(livedValue.count / max) * 100}%`, background: core.solid }} />
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
        {entries.map((entry) => (
          <LedgerItem key={entry.id} entry={entry} />
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

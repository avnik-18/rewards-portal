'use client'
export { RewardsLedger } from './rewards-ledger'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Avatar, Card } from '@/components/atoms'
import TemplateCard from '@/components/molecules/TemplateCard'
import LinkedInShareButton from '@/components/molecules/LinkedInShareButton'
import { personDisplayName } from '@/lib/mock-data-parts/people'
import type { RecognitionReceived } from '@/lib/mock-data'

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
                    <span className="font-extrabold text-navy">{personDisplayName(recognition.fromId)}</span>
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
                  className={`shrink-0 text-muted transition-transform duration-200 ${
                    expandedId === recognition.id ? 'rotate-180 text-brand' : ''
                  }`}
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
                        giver={personDisplayName(recognition.fromId)}
                        message={recognition.message}
                        valueLabel={recognition.value}
                        artUrl={recognition.artUrl}
                        receiverName={personDisplayName('me')}
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
                  <span className="font-extrabold text-navy">{personDisplayName(recognition.fromId)}</span>
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
                  giver={personDisplayName(recognition.fromId)}
                  message={recognition.message}
                  valueLabel={recognition.value}
                  receiverName={personDisplayName('me')}
                />
              )}
            </Card>
          ),
        )}
      </div>
    </div>
  )
}

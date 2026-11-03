'use client'

import { useState } from 'react'
import { Avatar, Card } from '@/components/atoms'
import TemplateCard from '@/components/molecules/TemplateCard'
import { kindLabel, type ApprovalVerdict } from '@/lib/approval'
import { CORE_VALUES, person } from '@/lib/mock-data'
import type { ApprovalItem } from '@/lib/mock-data'

const VERDICT_LABEL: Record<ApprovalVerdict, string> = {
  approved: 'Approved',
  declined: 'Next time',
  returned: 'Returned',
}

const VERDICT_CLASS: Record<ApprovalVerdict, string> = {
  approved: 'bg-mint text-white',
  declined: 'bg-warn text-navy-deep',
  returned: 'bg-warn text-navy-deep',
}

export interface ApprovalDetailProps {
  item: ApprovalItem
  /** Set once this viewer decides; shows the status pill instead of actions. */
  verdict?: ApprovalVerdict
  /** The typed comment travels with the verdict — it is NOT dropped. */
  onDecide: (verdict: ApprovalVerdict, note: string) => void
  /** Person id the action buttons act on behalf of. */
  viewerId: string
}

/** The approval reading pane — card header, template postcard, decision bar. */
export default function ApprovalDetail({ item, verdict, onDecide, viewerId }: ApprovalDetailProps) {
  const [comment, setComment] = useState('')
  const actionable = item.route.find((step) => !step.done)?.owner === viewerId

  return (
    <Card className="overflow-hidden">
      <div
        className="dotgrid px-6 py-4 text-white"
        style={{ background: 'linear-gradient(135deg, #154071 0%, #2563eb 100%)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10.5px] font-bold font-mono uppercase tracking-[0.08em] text-gold">
            {kindLabel(item.kind, item.points)}
          </p>
          {verdict && (
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${VERDICT_CLASS[verdict]}`}
            >
              {VERDICT_LABEL[verdict]}
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <Avatar id={item.fromId} size={42} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-extrabold">
              {person(item.fromId)?.name ?? 'Unknown teammate'}
            </p>
            <p className="truncate text-[12px] text-white/65">{person(item.fromId)?.title}</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-line">
        <section className="px-6 py-4">
          <p className="text-[14px] font-semibold text-navy">{item.title}</p>
          {item.artUrl ? (
            /* Template postcard — ditto the original approval reading pane */
            <div className="mt-3 overflow-hidden rounded-2xl border border-[#C9E4F2] bg-white">
              <TemplateCard
                tpl={item.template}
                url={item.artUrl}
                previewValue={item.value ? CORE_VALUES[item.value as keyof typeof CORE_VALUES] : null}
                recipients={(item.toIds ?? [item.fromId]).map((id) => ({
                  id,
                  label: person(id)?.name.split(' ')[0] ?? 'Unknown teammate',
                }))}
                points={item.points ?? 0}
                msg={item.detail.replace(/^"|"$/g, '')}
              />
            </div>
          ) : (
            <blockquote className="mt-2 rounded-xl border-l-4 border-slate-300 bg-slate-50 px-4 py-2.5 text-[13px] italic leading-snug text-ink">
              {item.detail}
            </blockquote>
          )}
        </section>

        <section className="px-6 py-4">
          {!verdict && actionable && (
            <>
              <input
                value={comment}
                onChange={(inputEvent) => setComment(inputEvent.target.value)}
                placeholder="Add a note (optional, visible in audit trail)"
                aria-label="Decision note"
                className="h-10 w-full rounded-xl border border-line bg-slate-50 px-4 text-sm outline-none focus:border-brand/40 focus:bg-white"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    onDecide('approved', comment.trim())
                    setComment('')
                  }}
                  className="rounded-xl bg-mint px-4 py-2 text-[13px] font-extrabold text-white transition hover:brightness-105"
                >
                  Approve
                </button>
                <button
                  onClick={() => {
                    onDecide('declined', comment.trim())
                    setComment('')
                  }}
                  className="rounded-xl border border-line px-4 py-2 text-[13px] font-extrabold text-navy transition hover:bg-slate-50"
                >
                  Next time
                </button>
              </div>
            </>
          )}
          {!verdict && !actionable && (
            <p className="text-[12.5px] text-muted">
              Waiting on {item.route.find((step) => !step.done)?.owner} before your step.
            </p>
          )}
          {verdict && (
            <p className="text-[12.5px] text-muted">Recorded {item.when} — visible in History with the audit trail.</p>
          )}
        </section>
      </div>
    </Card>
  )
}

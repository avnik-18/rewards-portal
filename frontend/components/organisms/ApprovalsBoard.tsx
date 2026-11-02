'use client'

import { useState, createElement } from 'react'
import { CheckCircle2, UserCheck } from 'lucide-react'
import { Avatar, Card } from '@/components/atoms'
import ApprovalListItem from '@/components/molecules/ApprovalListItem'
import TemplateCard from '@/components/molecules/TemplateCard'
import { useApprovals } from '@/hooks/use-approvals'
import { kindLabel, filterForTab, type ApprovalVerdict } from '@/lib/approval'
import { CORE_VALUES, person } from '@/lib/mock-data'
import type { ApprovalItem } from '@/lib/mock-data'

const TABS = [
  { key: 'inbox', label: 'To approve' },
  { key: 'endorse', label: 'Endorsements' },
  { key: 'done', label: 'History' },
] as const
type Tab = (typeof TABS)[number]['key']

export interface ApprovalsBoardProps {
  /** Approval requests from the data layer, newest first. */
  items: ApprovalItem[]
  /** Person id whose steps this viewer approves; defaults to the signed-in user. */
  viewerId?: string
}

/**
 * Client island: three-folder inbox with a reading pane. List + counts come
 * from lib/approval.ts pure helpers; decisions live in useApprovals.
 */
export default function ApprovalsBoard({ items, viewerId = 'me' }: ApprovalsBoardProps) {
  const { decided, decideItem } = useApprovals(items)
  const [tab, setTab] = useState<Tab>('inbox')
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null)

  const list = filterForTab(items, tab, decided)
  // keep a decided item in the reading pane even if it left the current folder
  const selected = list.find((a) => a.id === selectedId) ?? items.find((a) => a.id === selectedId) ?? list[0] ?? null

  const counts: Record<Tab, number> = {
    inbox: filterForTab(items, 'inbox', decided).length,
    endorse: filterForTab(items, 'endorse', decided).length,
    done: filterForTab(items, 'done', decided).length,
  }

  return (
    <div>
      <div className="grid items-start gap-4 lg:grid-cols-[150px_310px_1fr]">
        {/* Folder rail */}
        <nav aria-label="Approval folders">
          <div className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:pb-0">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                aria-pressed={tab === t.key}
                className={`flex w-full shrink-0 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition ${
                  tab === t.key ? 'bg-brand text-white' : 'text-muted hover:bg-slate-100 hover:text-ink'
                }`}
              >
                {t.label}
                {counts[t.key] > 0 && (
                  <span
                    className={`tnum rounded-full px-1.5 text-[11px] font-extrabold ${
                      tab === t.key ? 'bg-white/25 text-white' : 'bg-slate-100 text-ink'
                    }`}
                  >
                    {counts[t.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Mail list */}
        <div className="space-y-2">
          {list.map((a) => (
            <ApprovalListItem
              key={a.id}
              item={a}
              selected={selected?.id === a.id}
              onSelect={() => setSelectedId(a.id)}
            />
          ))}
          {list.length === 0 && (
            <BodyEmpty
              title={tab === 'done' ? 'No decisions yet' : 'Inbox zero'}
              sub={
                tab === 'done'
                  ? 'Your approvals will show up here with full audit trail.'
                  : 'Nothing routed to you right now.'
              }
            />
          )}
        </div>

        {/* Reading pane */}
        <div>
          {selected ? (
            <ApprovalDetail
              key={selected.id}
              item={selected}
              verdict={decided[selected.id]}
              onDecide={(v) => decideItem(selected, v)}
              viewerId={viewerId}
            />
          ) : (
            <BodyEmpty title="Select an item" sub="Pick something from the list to see the full request." />
          )}
        </div>
      </div>
    </div>
  )
}

function BodyEmpty({ title, sub }: { title: string; sub: string }) {
  const iconNode = title === 'Select an item' ? UserCheck : CheckCircle2
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-white px-6 py-10 text-center">
      <span className="text-brand">{createElement(iconNode, { size: 26, 'aria-hidden': true })}</span>
      <p className="text-[14px] font-extrabold text-navy">{title}</p>
      <p className="max-w-[260px] text-[12.5px] text-muted">{sub}</p>
    </div>
  )
}

export interface ApprovalDetailProps {
  item: ApprovalItem
  /** Set once this viewer decides; shows the status pill instead of actions. */
  verdict?: ApprovalVerdict
  onDecide: (verdict: ApprovalVerdict) => void
  /** Person id the action buttons act on behalf of. */
  viewerId: string
}

function ApprovalDetail({ item, verdict, onDecide, viewerId }: ApprovalDetailProps) {
  const [comment, setComment] = useState('')
  const actionable = item.route.find((s) => !s.done)?.owner === viewerId

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
              className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                verdict === 'approved' ? 'bg-mint text-white' : 'bg-warn text-navy-deep'
              }`}
            >
              {verdict === 'approved' ? 'Approved' : verdict === 'declined' ? 'Next time' : 'Returned'}
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <Avatar id={item.fromId} size={42} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-extrabold">{person(item.fromId).name}</p>
            <p className="truncate text-[12px] text-white/65">{person(item.fromId).title}</p>
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
                recipients={(item.toIds ?? [item.fromId]).map((id) => ({ id, label: person(id).name.split(' ')[0] }))}
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
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a note (optional, visible in audit trail)"
                aria-label="Decision note"
                className="h-10 w-full rounded-xl border border-line bg-slate-50 px-4 text-sm outline-none focus:border-brand/40 focus:bg-white"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => onDecide('approved')}
                  className="rounded-xl bg-mint px-4 py-2 text-[13px] font-extrabold text-white transition hover:brightness-105"
                >
                  Approve
                </button>
                <button
                  onClick={() => onDecide('declined')}
                  className="rounded-xl border border-line px-4 py-2 text-[13px] font-extrabold text-navy transition hover:bg-slate-50"
                >
                  Next time
                </button>
              </div>
            </>
          )}
          {!verdict && !actionable && (
            <p className="text-[12.5px] text-muted">
              Waiting on {item.route.find((s) => !s.done)?.owner} before your step.
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

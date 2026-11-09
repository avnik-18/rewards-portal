import { useState, createElement } from 'react'
import { CheckCircle2, UserCheck } from 'lucide-react'
import ApprovalListItem from '@/components/molecules/ApprovalListItem'
import ApprovalDetail from '@/components/organisms/approval-detail'
import { useApprovals } from '@/hooks/use-approvals'
import { filterForTab, type ApprovalVerdict } from '@/lib/approval'
import type { ApprovalItem } from '@/lib/data-api'

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
  /** Test/observer hook — fires with every decision taken in the board. */
  onDecide?: (verdict: ApprovalVerdict, note: string) => void
}

/**
 * Client island: three-folder inbox with a reading pane. List + counts come
 * from lib/approval.ts pure helpers; decisions live in useApprovals.
 */
export default function ApprovalsBoard({ items, viewerId = 'me', onDecide }: ApprovalsBoardProps) {
  const { decided, decideItem } = useApprovals(items)
  const [tab, setTab] = useState<Tab>('inbox')
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null)

  const list = filterForTab(items, tab, decided)
  // keep a decided item in the reading pane even if it left the current folder
  const selected =
    list.find((item) => item.id === selectedId) ?? items.find((item) => item.id === selectedId) ?? list[0] ?? null

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
            {TABS.map((folderTab) => (
              <button
                key={folderTab.key}
                onClick={() => setTab(folderTab.key)}
                aria-pressed={tab === folderTab.key}
                className={`flex w-full shrink-0 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition ${
                  tab === folderTab.key ? 'bg-brand text-white' : 'text-muted hover:bg-slate-100 hover:text-ink'
                }`}
              >
                {folderTab.label}
                {counts[folderTab.key] > 0 && (
                  <span
                    className={`tnum rounded-full px-1.5 text-[11px] font-extrabold ${
                      tab === folderTab.key ? 'bg-white/25 text-white' : 'bg-slate-100 text-ink'
                    }`}
                  >
                    {counts[folderTab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Mail list */}
        <div className="space-y-2">
          {list.map((item) => (
            <ApprovalListItem
              key={item.id}
              item={item}
              selected={selected?.id === item.id}
              onSelect={() => setSelectedId(item.id)}
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
              verdict={decided[selected.id]?.verdict}
              onDecide={(verdict, note) => {
                decideItem(selected, verdict, note)
                onDecide?.(verdict, note)
              }}
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

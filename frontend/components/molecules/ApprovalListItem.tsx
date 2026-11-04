import { Avatar } from '@/components/atoms'
import { person } from '@/lib/mock-data-parts/people'
import type { ApprovalItem } from '@/lib/mock-data'

export interface ApprovalListItemProps {
  item: ApprovalItem
  /** Rendered as the selected row when true. */
  selected: boolean
  onSelect: () => void
}

/** One mail-inbox-style row: sender avatar, title, meta line. Click to select. */
export default function ApprovalListItem({ item, selected, onSelect }: ApprovalListItemProps) {
  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full rounded-2xl border p-3.5 text-left transition ${
        selected
          ? 'border-brand shadow-lift ring-1 ring-brand/30'
          : 'border-line bg-white hover:border-brand/40 hover:bg-slate-50/60'
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar id={item.fromId} size={38} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[13px] font-semibold leading-tight text-navy">{item.title}</p>
          <p className="mt-1 truncate text-[12px] text-muted">
            {person(item.fromId)?.name ?? 'Unknown teammate'} · {item.when}
          </p>
        </div>
      </div>
    </button>
  )
}

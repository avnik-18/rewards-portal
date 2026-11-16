import type { UnreadNotification } from '@/lib/data-api'

/** One unread bell-panel row: '<giver> recognised you (+N pts)' for praise,
 *  a humanised label for system notifications, the message preview, the day. */
export function NotificationRow({ n }: { n: UnreadNotification }) {
  const from = n.giver_name ?? 'Someone'
  const praise = n.points !== null
  const copy = praise
    ? `${from} recognised you (+${n.points} pts)`
    : n.type.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
  const day = new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return (
    <li className="border-b border-line px-3 py-2.5 last:border-b-0">
      <p className="truncate text-[12.5px] font-bold text-ink">{copy}</p>
      {n.message && <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-muted">{n.message}</p>}
      <p className="mt-0.5 text-[10.5px] font-semibold text-slate-400">{day}</p>
    </li>
  )
}

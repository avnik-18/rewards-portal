import type { UnreadNotification } from '@/lib/data-api'

/** Bell-panel row copy per notification type (0023 lanes):
 *  praise_received → '<giver> recognised you (+N pts)'
 *  praise_sent     → 'You recognised <receiver> · +N pts' (multi-recipient:
 *                    '<receiver> +2 more')
 *  praise_cc       → '<giver> copied you — recognised <receiver>'
 *  others          → humanised system label. Message preview + day follow. */
export function NotificationRow({ n }: { n: UnreadNotification }) {
  const from = n.giver_name ?? 'Someone'
  const points = n.points !== null && n.points > 0 ? ` · +${n.points} pts` : ''

  let copy: string
  if (n.type === 'praise_received') {
    copy = `${from} recognised you${n.points !== null && n.points > 0 ? ` (+${n.points} pts)` : ''}`
  } else if (n.type === 'praise_sent') {
    const receiver = n.receiver_name ?? 'a teammate'
    const extra = n.receiver_count > 1 ? ` +${n.receiver_count - 1} more` : ''
    copy = `You recognised ${receiver}${extra}${points}`
  } else if (n.type === 'praise_cc') {
    const receiver = n.receiver_name ?? 'a teammate'
    copy = `${from} copied you — recognised ${receiver}`
  } else {
    copy = n.type.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
  }

  const day = new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return (
    <li className="border-b border-line px-3 py-2.5 last:border-b-0">
      <p className="truncate text-[12.5px] font-bold text-ink">{copy}</p>
      {n.message && <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-muted">{n.message}</p>}
      <p className="mt-0.5 text-[10.5px] font-semibold text-slate-400">{day}</p>
    </li>
  )
}

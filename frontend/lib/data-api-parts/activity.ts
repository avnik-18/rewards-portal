import { apiFetch } from '../api-client'
import { APPROVALS, NOTIFICATIONS, type ApprovalItem, type NotificationItem, type Post } from '../mock-data'
import { fmtWhen } from '../format'

export async function getApprovals(): Promise<ApprovalItem[]> {
  return APPROVALS
}

export async function getNotifications(): Promise<NotificationItem[]> {
  return NOTIFICATIONS
}

/** One GET /feed recipient — backend keys verbatim. */
interface FeedApiRecipient {
  user_id: string
  name: string | null
  points: number
  kind: string
}

/** One GET /feed item inside the FeedResponse envelope — backend keys verbatim. */
interface FeedApiItem {
  recognition_id: string
  tier: 'bu' | 'own' | 'team' | 'related'
  occurred_at: string
  giver_id: string | null
  giver_name: string | null
  kind: Post['kind']
  message: string
  points: number
  value_label: string | null
  recipients: FeedApiRecipient[]
}

/** One entry of the dashboard recognition feed in UI terms. Names arrive
 *  resolved from the backend (the mock directory knows nothing about
 *  backend users); only the "when" label is computed here, from the ISO
 *  stamp, so "2 h ago"/"Yesterday" still read as sentences. */
export interface FeedPost {
  id: string
  kind: Post['kind']
  tier: 'bu' | 'own' | 'team' | 'related'
  fromName: string
  recipients: { name: string; points: number }[]
  points: number
  message: string
  valueLabel: string | null
  when: string
}

/** The recognition feed shown on the dashboard, newest entry first. */
export async function getFeedPosts(): Promise<FeedPost[]> {
  const body = await apiFetch<{ items: FeedApiItem[] }>('/feed')
  return body.items.map((row) => ({
    id: row.recognition_id,
    kind: row.kind,
    tier: row.tier,
    fromName: row.giver_name ?? 'Someone',
    recipients: row.recipients
      .filter((recipient) => recipient.kind === 'to')
      .map((recipient) => ({ name: recipient.name ?? 'A teammate', points: recipient.points })),
    points: row.points,
    message: row.message,
    valueLabel: row.value_label,
    when: fmtWhen(row.occurred_at),
  }))
}

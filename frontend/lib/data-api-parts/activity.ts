import { apiFetch, apiPost } from '../api-client'
import { APPROVALS, NOTIFICATIONS, type ApprovalItem, type ApprovalKind, type NotificationItem, type Post } from '../mock-data'
import { fmtWhen } from '../format'
import type {
  DecisionResponse,
  MarkReadResponse,
  PendingApprovalRow,
  UnreadCountResponse,
  UnreadNotification,
} from './live-api-shapes'

/** The decide endpoint the approvals board calls through. */
export async function decideApproval(item: ApprovalItem, approve: boolean, note: string): Promise<DecisionResponse> {
  return apiPost<DecisionResponse>(`/recognitions/approval/${item.id}/decide`, {
    approve,
    note: note.trim() ? note.trim() : undefined,
  })
}

/**
 * The approvals queue. LIVE first: GET /recognitions/approvals — decisions
 * actually routed to the signed-in approver. The board's richer mock shape is
 * reconstructed from the lean rows (route = this pending step; kind = points
 * approval). Endorsement/redemption kinds don't exist on the lane yet, so the
 * mock items stay as the outage fallback — loudly logged.
 */
export async function getApprovals(): Promise<ApprovalItem[]> {
  try {
    const rows = await apiFetch<PendingApprovalRow[]>('/recognitions/approvals')
    return rows.map((row) => mapApprovalRow(row))
  } catch (error) {
    console.error('[data-api] live approvals unavailable — showing the demo queue:', error)
    return APPROVALS
  }
}

function mapApprovalRow(row: PendingApprovalRow): ApprovalItem {
  const kind: ApprovalKind = row.kind === 'nomination' ? 'nomination-endorsement' : 'points-approval'
  const level = row.level.replace(/[_-]+/g, ' ').trim() || 'approval'
  const points = row.points ?? 0
  return {
    id: row.approval_item_id,
    kind,
    fromId: row.owner_id,
    points,
    when: 'Awaiting your decision',
    title: `${row.submitter_name} wants to award +${points} pts`,
    detail: row.note ? `"${row.note}"` : 'No note attached to this recognition.',
    route: [{ step: `${level} (you)`, owner: 'me', done: false }],
    budget: points > 0 ? `Award of ${points} points, routed via ${level}` : 'No points move',
  }
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

/** The recognition feed shown on the dashboard, newest entry first —
 *  LIVE from GET /feed (per-viewer ranked, tiered fn_feed_posts). */
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

/** Deliverable #6 — the bell badge is the LIVE unread count (delivered &&
 *  unread, per the API's read-rule). A badge has no error surface — but the
 *  failure is logged loudly so a dead backend can't pass unnoticed. */
export async function getUnreadCount(): Promise<number> {
  try {
    const data = await apiFetch<UnreadCountResponse>('/notifications/unread-count')
    return data.unread_count
  } catch (error) {
    console.error('[data-api] unread badge unavailable — showing 0:', error)
    return 0
  }
}

/** The unread bell-panel feed (GET /notifications) — the API hands rows enriched
 *  with giver name + points via the dedupe-key join. */
export async function getUnreadFeed(): Promise<UnreadNotification[]> {
  return apiFetch<UnreadNotification[]>('/notifications?limit=20')
}

/** "Read once, it disappears" — marks every delivered+unread row read;
 *  re-fetches are empty and the badge drops to 0 afterwards. */
export async function markAllNotificationsRead(): Promise<number> {
  const body = await apiPost<MarkReadResponse>('/notifications/read', {})
  return body.marked_read
}

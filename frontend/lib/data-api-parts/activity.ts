import { APPROVALS, NOTIFICATIONS, type ApprovalItem, type NotificationItem } from '../mock-data'
import { apiFetch, apiPost } from '../api-client'
import type { UnreadCountResponse, UnreadNotification } from './live-api-shapes'

export async function getApprovals(): Promise<ApprovalItem[]> {
  return APPROVALS
}

export async function getNotifications(): Promise<NotificationItem[]> {
  return NOTIFICATIONS
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
  const body = await apiPost<{ marked_read: number }>('/notifications/read', {})
  return body.marked_read
}

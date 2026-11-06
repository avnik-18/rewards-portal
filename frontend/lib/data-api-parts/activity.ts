import { APPROVALS, NOTIFICATIONS, type ApprovalItem, type NotificationItem } from '../mock-data'

export async function getApprovals(): Promise<ApprovalItem[]> {
  return APPROVALS
}

export async function getNotifications(): Promise<NotificationItem[]> {
  return NOTIFICATIONS
}

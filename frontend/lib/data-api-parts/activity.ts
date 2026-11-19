import { APPROVALS, NOTIFICATIONS, POSTS, type ApprovalItem, type NotificationItem, type Post } from '../mock-data'

export async function getApprovals(): Promise<ApprovalItem[]> {
  return APPROVALS
}

export async function getNotifications(): Promise<NotificationItem[]> {
  return NOTIFICATIONS
}

/** The recognition feed shown on the dashboard, newest entry first. */
export async function getFeedPosts(): Promise<Post[]> {
  return POSTS
}

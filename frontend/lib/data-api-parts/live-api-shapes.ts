/** Backend DTO shapes (mirrors rewards-portal-api schemas) — the façade maps
 * them to the existing component shapes below, so components stay untouched. */

export interface LeaderboardEntry {
  rank: number
  name: string
  points: number
  is_me: boolean
}

export interface ShowcaseResponse {
  days_to_nominations_close: number | null
  open_categories: number
  cycle_prize_total: number
  my_jury: { cast: boolean; assigned: boolean }
}

export interface UnreadCountResponse {
  unread_count: number
}

/** One unread bell-panel row — GET /notifications (backend PR #8). */
export interface UnreadNotification {
  id: string
  type: string
  giver_name: string | null
  points: number | null
  message: string | null
  created_at: string
}

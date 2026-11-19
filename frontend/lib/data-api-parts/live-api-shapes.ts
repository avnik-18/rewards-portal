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

/** One unread bell-panel row — GET /notifications (backend PR #8 + 0023). */
export interface UnreadNotification {
  id: string
  type: string
  giver_name: string | null
  receiver_name: string | null
  receiver_count: number
  points: number | null
  message: null | string
  created_at: string
}

/** One recognizable person — GET /people. */
export interface PersonRow {
  id: string
  employee_code: string
  full_name: string
  email: string
  title: string | null
  department: string | null
  manager_id: string | null
  manager_code: string | null
  manager_name: string | null
}

/** One active recognition template — nested under a value. */
export interface TemplateRow {
  id: string
  name: string
  emoji: string | null
  art_urls: string[]
  prefill: string | null
}

/** One active emids value with its templates — GET /values. */
export interface ValueRow {
  id: string
  key: string
  label: string
  templates: TemplateRow[]
}

/** POST /recognitions response — fn_submit_recognition's report. */
export interface RecognizeResponse {
  recognition_id: string
  status: string
  routed_to: number
  approval_item_id: string | null
}

/** GET /recognitions/approvals row — one pending decision routed to the actor. */
export interface PendingApprovalRow {
  approval_item_id: string
  kind: string
  seq: number
  level: string
  mode: string
  owner_id: string
  submitter_name: string
  points: number
  note: string | null
}

/** POST /recognitions/approval/{id}/decide response. */
export interface DecisionResponse {
  approval_item_id: string
  status: string
}

/** POST /recognitions/read response. */
export interface MarkReadResponse {
  marked_read: number
}

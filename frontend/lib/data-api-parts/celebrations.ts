import { apiFetch } from '../api-client'

/** Upcoming events (GET /celebrations) — the caller's relevant people's
 *  birthdays/anniversaries plus org-wide admin-posted events, ordered by
 *  soonest. event rows carry no person; the title rides in full_name. */
export interface Celebration {
  employee_code: string | null
  full_name: string
  kind: 'birthday' | 'anniversary' | 'event'
  event_at: string
  days_until: number
  detail: string | null
}

export async function getCelebrations(): Promise<Celebration[]> {
  return apiFetch<Celebration[]>('/celebrations?days=30')
}

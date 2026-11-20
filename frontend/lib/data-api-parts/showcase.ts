import { apiFetch } from '../api-client'

/** The live quarterly award cycle (GET /awards/showcase) — the clock, the
 *  open categories, the prize pot, and the caller's jury state. */
export interface AwardsCycle {
  days_to_nominations_close: number | null
  open_categories: number
  cycle_prize_total: number
  my_jury: {
    cast: boolean
    assigned: boolean
  }
}

export async function getAwardsCycle(): Promise<AwardsCycle> {
  return apiFetch<AwardsCycle>('/awards/showcase')
}

import { apiFetch } from '../api-client'

/** Admin-authored awards catalog — GET /awards. The Guidelines sections,
 *  cadence and nomination quota are row data (the awards table), so the
 *  portal never hard-codes eligibility text. */
export type AwardCadence = 'monthly' | 'quarterly' | 'annual'

export interface AwardGuideline {
  title: string
  lines: string[]
}

export interface AwardRow {
  id: string
  name: string
  description: string | null
  cadence: AwardCadence
  period_name: string
  period_start: string
  period_end: string
  nominations_end: string | null
  prize_points: number
  nomination_quota: number
  requires_jury: boolean
  guidelines: AwardGuideline[]
}

export async function getAwards(): Promise<AwardRow[]> {
  const data = await apiFetch('/awards')
  const awards = data as { awards: AwardRow[] }
  return awards.awards
}

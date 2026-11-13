import { apiGet } from '../api-client'

export async function getMe(): Promise<{ name: string }> {
  const profile = await apiGet<{
    id: string
    employee_code: string
    full_name: string
    email: string | null
    role: string
  }>('/me')
  return { name: profile.full_name }
}

/** Kept only for the profile screen, which stays on mock data until its
 *  backend endpoints land — the balance the mock-era UI carries. */
export const WELCOME_BONUS_POINTS = 1240

export interface MeStats {
  balance: number
  given: number
  got: number
  orgRecognitions: number
}

export async function getDashboardStats(): Promise<MeStats> {
  const [stats, orgCount] = await Promise.all([
    apiGet<{
      points_balance: number
      recognitions_given: number
      recognitions_received: number
    }>('/me/stats'),
    apiGet<{ total: number }>('/recognitions/count'),
  ])
  return {
    balance: stats.points_balance,
    given: stats.recognitions_given,
    got: stats.recognitions_received,
    orgRecognitions: orgCount.total,
  }
}

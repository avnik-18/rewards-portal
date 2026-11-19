import { mirrorFetch } from './mirror'

/** The signed-in person's profile — verbatim backend names (GET /me is
 *  actor-scoped: the header identity decides whose row resolves). */
export interface MeProfile {
  employee_code: string
  full_name: string
  email: string | null
  role: string
  /** Feed/composer persona (fn_persona): admins and leaders may attach points;
   *  plain employees send zero-point peer cheers. */
  persona: 'admin' | 'leader' | 'employee'
  title: string | null
  department: string | null
}

export async function getMe(): Promise<MeProfile> {
  return mirrorFetch('/me') as Promise<MeProfile>
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

/** Dashboard tiles: the actor-scoped /me/stats figures alongside the
 *  org-wide APPROVED-recognitions counter (GET /recognitions/count). */
export async function getDashboardStats(): Promise<MeStats> {
  const [stats, orgCount] = await Promise.all([
    mirrorFetch('/me/stats') as Promise<{
      points_balance: number
      recognitions_given: number
      recognitions_received: number
    }>,
    mirrorFetch('/recognitions/count') as Promise<{ total: number }>,
  ])
  return {
    balance: stats.points_balance,
    given: stats.recognitions_given,
    got: stats.recognitions_received,
    orgRecognitions: orgCount.total,
  }
}

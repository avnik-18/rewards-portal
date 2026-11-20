import { apiFetch } from '../api-client'

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
  return apiFetch<MeProfile>('/me')
}

/** The company's unspent recognition pool for the current fiscal period —
 *  admin-only read (GET /me/company-wallet); admins trade the personal
 *  balance tile for this org-wide figure. */
export async function getCompanyWallet(): Promise<number> {
  const body = await apiFetch<{ total: number }>('/me/company-wallet')
  return body.total
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
    apiFetch<{
      points_balance: number
      recognitions_given: number
      recognitions_received: number
    }>('/me/stats'),
    apiFetch<{ total: number }>('/recognitions/count'),
  ])
  return {
    balance: stats.points_balance,
    given: stats.recognitions_given,
    got: stats.recognitions_received,
    orgRecognitions: orgCount.total,
  }
}

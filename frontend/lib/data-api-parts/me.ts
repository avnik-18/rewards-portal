import { apiFetch } from '../api-client'
import { DASH_STATS } from '../mock-data'

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

/** The mock starting balance the signed-in user carries until the backend
 *  earns it for real — named so the façade carries no magic number. */
export const WELCOME_BONUS_POINTS = 1240

/** Org-wide APPROVED-recognitions counter, served by the FastAPI backend
 *  (GET /recognitions/count). The remaining stats stay mock until their
 *  APIs exist — the page's all-or-nothing error state is honest about it. */
async function fetchRecognitionsCount(): Promise<number> {
  const body = await apiFetch<{ total: number }>('/recognitions/count')
  return body.total
}

export async function getDashboardStats(): Promise<{
  balance: number
  given: number
  got: number
  orgRecognitions: number
}> {
  return {
    balance: WELCOME_BONUS_POINTS,
    given: DASH_STATS.given,
    got: DASH_STATS.got,
    orgRecognitions: await fetchRecognitionsCount(),
  }
}

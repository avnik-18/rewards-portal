import { apiFetch } from '../api-client'
import { DASH_STATS } from '../mock-data'

export async function getMe(): Promise<{ name: string }> {
  return { name: 'Ayan' }
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

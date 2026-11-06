import { DASH_STATS, ORG_STATS } from '../mock-data'

export async function getMe(): Promise<{ name: string }> {
  return { name: 'Ayan' }
}

/** The mock starting balance the signed-in user carries until the backend
 *  earns it for real — named so the façade carries no magic number. */
export const WELCOME_BONUS_POINTS = 1240

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
    orgRecognitions: ORG_STATS.recognitions,
  }
}

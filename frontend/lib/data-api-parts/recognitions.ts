import { ApiError, apiPost } from '../api-client'
import { valueIdFor } from '../data-api-parts/lookups'
import type { RecognizeResponse } from './live-api-shapes'

export interface RecognitionPayload {
  toIds: string[]
  ccIds?: string[]
  valueKey: string
  message: string
  points: number
  artUrl?: string
  tplId?: string
}

export interface CreatedRecognition {
  id: string
  fromId: string
  toIds: string[]
  ccIds: string[]
  valueKey: string
  message: string
  points: number
  artUrl?: string
  when: string
  /** fn_submit_recognition report — pending steps routed, null when auto-approved. */
  routedTo?: number
  approvalItemId?: string | null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** An error whose message is user-safe (mapped from the backend's code) —
 *  the send hook surfaces it verbatim; other failures get the generic text. */
export class SendRejected extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SendRejected'
  }
}

const FRIENDLY_ERRORS: Record<string, string> = {
  insufficient_points: "You don't have enough points left in this period's allowance.",
  person_inactive: 'That teammate is not active and cannot receive recognition right now.',
  self_recognition_blocked: 'You cannot recognize yourself.',
  guest_cannot_receive: 'Guests cannot receive recognition — pick a colleague from the directory.',
  no_allowance_for_period: 'No points allowance is set up for this period yet.',
  points_out_of_range: 'Those points are outside the allowed range.',
  value_not_found: 'The chosen value no longer exists — pick it again from the list.',
  template_not_found: 'The chosen template no longer exists — pick it again.',
  template_value_mismatch: 'That template does not belong to the chosen value — pick a matching template.',
  account_not_found: "The recipient's points account is missing — contact an admin.",
  no_approval_route: 'This recognition has no approval route configured — contact an admin.',
  recipient_not_found: 'Someone you picked is no longer in the directory — re-pick the recipients.',
  person_not_found: 'Someone you picked is no longer in the directory — re-pick the recipients.',
}

/**
 * LIVE send: POST /recognitions (the fn_submit_recognition lane). Body ids are
 * backend UUIDs — typed-email chips have no user id and cannot receive points,
 * so they are rejected with an honest message instead of a mysterious 422.
 * The API's own Idempotency-Key (apiPost) keeps retried sends safe.
 */
export async function sendRecognition(input: RecognitionPayload): Promise<CreatedRecognition> {
  // typed-email chips (no user id — created as 'email-…' or raw addresses)
  // cannot receive points; ids that came out of the directory row set pass
  const nonDirectory = [...input.toIds, ...(input.ccIds ?? [])].filter(
    (id) => id.includes('@') || id.startsWith('email-'),
  )
  if (nonDirectory.length) {
    throw new SendRejected('Typed email addresses cannot receive points — pick people from the directory.')
  }
  const directoryIds = input.toIds.filter((id) => UUID_RE.test(id))
  const ccIds = input.ccIds ?? []
  const ccDirectoryIds = ccIds.filter((id) => UUID_RE.test(id))

  const body = {
    to_user_ids: directoryIds,
    cc_user_ids: ccDirectoryIds,
    value_id: valueIdFor(input.valueKey) ?? undefined,
    template_id: input.tplId && UUID_RE.test(input.tplId) ? input.tplId : undefined,
    art_url: input.artUrl?.slice(0, 2048) ?? undefined,
    points: input.points,
    message: input.message,
  }

  let response: RecognizeResponse
  try {
    response = await apiPost<RecognizeResponse>('/recognitions', body)
  } catch (error) {
    if (error instanceof ApiError && error.code && FRIENDLY_ERRORS[error.code]) {
      throw new SendRejected(FRIENDLY_ERRORS[error.code])
    }
    throw error
  }

  return {
    id: response.recognition_id,
    fromId: 'me',
    toIds: input.toIds,
    ccIds,
    valueKey: input.valueKey,
    message: input.message,
    points: input.points,
    artUrl: input.artUrl,
    when: 'Just now',
    routedTo: response.routed_to,
    approvalItemId: response.approval_item_id,
  }
}

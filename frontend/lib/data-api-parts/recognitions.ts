import { mirrorPost } from './mirror'
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
  // fn_submit_recognition report: pending steps routed, null when auto-approved.
  routedTo?: number
  approvalItemId?: string | null
}

/** An error whose message is user-safe (the send hook surfaces it verbatim). */
export class SendRejected extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SendRejected'
  }
}

/** The offline POST /recognitions through the mirror: typed-email chips (no
 *  user id) are rejected with an honest message, real sends become a feed
 *  item / approval row in-session (mirrorPost mutates the snapshot). */
export async function sendRecognition(input: RecognitionPayload): Promise<CreatedRecognition> {
  const nonDirectory = [...input.toIds, ...(input.ccIds ?? [])].filter(
    (id) => id.includes('@') || id.startsWith('email-'),
  )
  if (nonDirectory.length) {
    throw new SendRejected('Typed email addresses cannot receive points — pick people from the directory.')
  }

  const response = await mirrorPost('/recognitions', {
    to_user_ids: input.toIds,
    cc_user_ids: input.ccIds ?? [],
    points: input.points,
    message: input.message,
    art_url: input.artUrl?.slice(0, 2048),
  }) as unknown as RecognizeResponse

  return {
    id: response.recognition_id,
    fromId: 'me',
    toIds: input.toIds,
    ccIds: input.ccIds ?? [],
    valueKey: input.valueKey,
    message: input.message,
    points: input.points,
    artUrl: input.artUrl,
    when: 'Just now',
    routedTo: response.routed_to,
    approvalItemId: response.approval_item_id,
  }
}

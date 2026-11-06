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
}

/** Mock send: returns the created recognition immediately. */
export async function sendRecognition(input: RecognitionPayload): Promise<CreatedRecognition> {
  return {
    id: 'r' + Date.now(),
    fromId: 'me',
    toIds: input.toIds,
    ccIds: input.ccIds ?? [],
    valueKey: input.valueKey,
    message: input.message,
    points: input.points,
    artUrl: input.artUrl,
    when: 'Just now',
  }
}

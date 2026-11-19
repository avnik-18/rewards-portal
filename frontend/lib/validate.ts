// Pure validation for the Compose form — no React, no data access,
// so it is trivially unit-testable.

export interface RecognitionInput {
  toIds?: string[]
  valueKey?: string | null
  message?: string
  points?: number
}

export interface FieldErrors {
  toIds?: string
  valueKey?: string
  message?: string
  points?: string
}

export function validateRecognition(input: RecognitionInput): FieldErrors {
  const errors: FieldErrors = {}

  if (!input.toIds || input.toIds.length === 0) {
    errors.toIds = 'Pick a teammate to recognize.'
  }

  if (!input.valueKey) {
    errors.valueKey = 'Pick the emids value they demonstrated.'
  }

  const msg = input.message?.trim() ?? ''
  if (msg.length < 10) {
    errors.message = 'Tell us what they did — at least 10 characters.'
  } else if (msg.length > 280) {
    errors.message = 'Keep the note under 280 characters.'
  }

  const pts = input.points ?? 0
  if (!Number.isInteger(pts) || pts < 0 || pts > 100) {
    errors.points = 'Points must be between 0 and 100.'
  }

  return errors
}

export const hasErrors = (errors: FieldErrors) => Object.keys(errors).length > 0

import { describe, it, expect } from 'vitest'
import { validateRecognition, hasErrors } from '@/lib/validate'

describe('validateRecognition (unit)', () => {
  it('flags everything when the form is empty', () => {
    const errs = validateRecognition({})
    expect(errs.toIds).toBeTruthy()
    expect(errs.valueKey).toBeTruthy()
    expect(errs.message).toBeTruthy()
    expect(errs.points).toBeFalsy() // 0 points is fine
  })

  it('requires a recipient', () => {
    const errs = validateRecognition({ message: 'shipped the release on time', points: 25, valueKey: 'ownership' })
    expect(errs.toIds).toBe('Pick a teammate to recognize.')
  })

  it('requires an emids value', () => {
    const errs = validateRecognition({ toIds: ['p3'], message: 'shipped the release on time', points: 0 })
    expect(errs.valueKey).toBe('Pick the emids value they demonstrated.')
  })

  it('requires a note of at least 10 characters', () => {
    expect(
      validateRecognition({ toIds: ['p3'], valueKey: 'ownership', message: 'shipped', points: 0 }).message,
    ).toBeTruthy()
    expect(
      validateRecognition({ toIds: ['p3'], valueKey: 'ownership', message: '  short  ', points: 0 }).message,
    ).toBeTruthy()
  })

  it('rejects notes longer than 280 characters', () => {
    const long = 'x'.repeat(281)
    expect(validateRecognition({ toIds: ['p3'], valueKey: 'ownership', message: long, points: 0 }).message).toBeTruthy()
  })

  it('accepts a trimmed note of exactly 10 characters', () => {
    const errs = validateRecognition({ toIds: ['p3'], valueKey: 'ownership', message: 'x'.repeat(10), points: 0 })
    expect(hasErrors(errs)).toBe(false)
  })

  it('rejects points outside 0-100 and non-integers', () => {
    expect(
      validateRecognition({ toIds: ['p3'], valueKey: 'ownership', message: 'shipped the release', points: 101 }).points,
    ).toBeTruthy()
    expect(
      validateRecognition({ toIds: ['p3'], valueKey: 'ownership', message: 'shipped the release', points: -1 }).points,
    ).toBeTruthy()
    expect(
      validateRecognition({ toIds: ['p3'], valueKey: 'ownership', message: 'shipped the release', points: 12.5 })
        .points,
    ).toBeTruthy()
  })

  it('passes a completely valid recognition', () => {
    const errs = validateRecognition({
      toIds: ['p3'],
      valueKey: 'ownership',
      message: 'Priya shipped the release on time.',
      points: 50,
    })
    expect(hasErrors(errs)).toBe(false)
  })
})

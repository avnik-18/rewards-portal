import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRecipients } from '@/hooks/use-recipients'
import { useSendRecognition } from '@/hooks/use-send-recognition'
import { useComposeForm } from '@/hooks/use-compose-form'
import { PEOPLE, VALUE_TEMPLATES } from '@/lib/mock-data'
import { AI_DRAFTS } from '@/lib/compose'
import type { ValueKey } from '@/lib/data-api'
import type { ComposePerson } from '@/hooks/use-recipients'
import type { CreatedRecognition } from '@/lib/data-api'

// the send half is mocked so both the success and the failure lifecycle run
const manRecognition: CreatedRecognition = { id: 'rec-test' } as unknown as CreatedRecognition
const sendRecognitionMock = vi.fn(() => Promise.resolve(manRecognition))
vi.mock('@/lib/data-api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/data-api')>()
  return { ...mod, sendRecognition: (...args: unknown[]) => sendRecognitionMock(...(args as [])) }
})

const dirPeople: ComposePerson[] = Object.values(PEOPLE)
  .filter((entry) => entry.id !== 'me')
  .map((entry) => ({
    id: entry.id,
    name: entry.name,
    title: entry.title,
    email: entry.email,
    managerId: entry.managerId,
  }))

afterEach(() => {
  vi.useRealTimers()
  sendRecognitionMock.mockClear()
})

describe('useRecipients (unit)', () => {
  const setup = () => renderHook(() => useRecipients(dirPeople))

  it('starts empty and searches the directory, skipping already-picked people', () => {
    const { result } = setup()
    const r = result.current

    expect(r.toSel).toEqual([])
    expect(r.pickResults('')).toEqual([])

    const byName = r.pickResults('priya')
    expect(byName.some((p) => p.id === 'p3')).toBe(true)

    act(() => r.addToSel('p3'))
    const afterPick = result.current.pickResults('priya')
    expect(afterPick.some((p) => p.id === 'p3')).toBe(false)
  })

  it('adds a person once, guards duplicates and removes both ways', () => {
    const { result } = setup()

    let added = false
    act(() => {
      added = result.current.addToSel('p1')
    })
    expect(added).toBe(true)
    act(() => {
      added = result.current.addToSel('p1')
    })
    expect(added).toBe(false)
    expect(result.current.toSel).toEqual(['p1'])

    // a person already in To cannot be CC'd again
    expect(result.current.addToCcSel('p1')).toBe(false)

    act(() => result.current.addToCcSel('p2'))
    act(() => result.current.removeFromCcSel('p2'))
    expect(result.current.ccSel).toEqual([])
    act(() => result.current.removeFromToSel('p1'))
    expect(result.current.toSel).toEqual([])
  })

  it('adds typed emails to To and CC with labels, and returns directory-safe email candidates', () => {
    const { result } = setup()

    expect(result.current.emailCandidate('priya@')).toBeNull() // malformed
    const knownEmail = dirPeople[0].email // already in the directory
    expect(result.current.emailCandidate(knownEmail)).toBeNull()
    expect(result.current.emailCandidate('guest@outside.dev')).toBe('guest@outside.dev')

    act(() => result.current.addEmailToTo('guest@outside.dev', 'email-c1'))
    act(() => result.current.addEmailToCc('contractor@outside.dev', 'email-c2'))
    expect(result.current.toSel).toContain('email-c1')
    expect(result.current.ccSel).toContain('email-c2')
    expect(result.current.labels['email-c1']).toBe('guest@outside.dev')
    expect(result.current.recipients.map((r) => r.label)).toContain('guest@outside.dev')
  })

  it('collects the managers of picked recipients automatically', () => {
    const { result } = setup()
    act(() => result.current.addToSel('p1'))
    const managers = result.current.ccManagers
    expect(managers.length).toBeGreaterThanOrEqual(0)
    expect(new Set(managers).size).toBe(managers.length) // no duplicates
  })
})

describe('useSendRecognition (unit)', () => {
  const input = (overrides: Partial<Parameters<typeof useSendRecognition>[0]> = {}) => ({
    toIds: [],
    ccIds: [],
    valueKey: 'ownership' as ValueKey,
    message: 'A positive, specific, genuine appreciation for the work.',
    points: 25,
    tplId: null,
    artUrl: () => '/xoxo/banner.png',
    ...overrides,
  })

  it('blocks the send without recipients and shows the pickup error', async () => {
    const { result } = renderHook(() => useSendRecognition(input()))
    await act(async () => {
      await result.current.submit()
    })
    expect(result.current.errors.toIds).toBeTruthy()
    expect(result.current.status).toBe('idle')
    expect(sendRecognitionMock).not.toHaveBeenCalled()
  })

  it('blocks invalid notes before any request', async () => {
    const { result } = renderHook(() => useSendRecognition(input({ toIds: ['p1'], message: 'small' })))
    await act(async () => {
      await result.current.submit()
    })
    expect(result.current.errors.message).toBeTruthy()
    expect(result.current.status).toBe('idle')
    expect(sendRecognitionMock).not.toHaveBeenCalled()
  })

  it('sends through to the sent lifecycle and records the created recognition', async () => {
    const { result } = renderHook(() => useSendRecognition(input({ toIds: ['p1'], ccIds: ['p2'] })))
    await act(async () => {
      await result.current.submit()
    })
    expect(result.current.status).toBe('sent')
    expect(result.current.created).toEqual(manRecognition)
    expect(sendRecognitionMock).toHaveBeenCalledWith(
      expect.objectContaining({ toIds: ['p1'], ccIds: ['p2'], valueKey: 'ownership', points: 25 }),
    )
  })

  it("never strands the button on 'sending' — a failed send resets to idle with an error", async () => {
    sendRecognitionMock.mockImplementation(() => Promise.reject(new Error('network down')))
    const { result } = renderHook(() => useSendRecognition(input({ toIds: ['p1'] })))
    await act(async () => {
      await result.current.submit()
    })
    expect(result.current.status).toBe('idle')
    expect(result.current.created).toBeNull()
    expect(result.current.errors.message).toContain('Sending failed')
    // a retry from idle is possible
    sendRecognitionMock.mockImplementation(() => Promise.resolve(manRecognition))
    await act(async () => {
      await result.current.submit()
    })
    expect(result.current.status).toBe('sent')
  })

  it('isBusy mirrors only the sending state', () => {
    const { result } = renderHook(() => useSendRecognition(input()))
    expect(result.current.isBusy()).toBe(false)
    expect(result.current.status).toBe('idle')
  })

  it('setErrors lets the form surface field errors externally', () => {
    const { result } = renderHook(() => useSendRecognition(input()))
    act(() => result.current.setErrors({ message: 'Tell us what they did — at least 10 characters.' }))
    expect(result.current.errors.message).toContain('at least 10 characters')
  })
})

describe('useComposeForm (unit)', () => {
  const setup = () => renderHook(() => useComposeForm(dirPeople))

  it('starts clean and gates the send button on payload completeness', () => {
    const { result } = setup()
    const r = result.current
    expect(r.canSend).toBe(false)
    expect(r.valueKey).toBeNull()
    expect(r.previewValue).toBeNull()
  })

  it('unlocks canSend once recipient, value prefill and note land', () => {
    const { result } = setup()
    act(() => result.current.addToSel('p3'))
    expect(result.current.canSend).toBe(false)
    // the value prefill itself is a full-sentence note and unlocks the button
    act(() => result.current.chooseValue('ownership'))
    expect(result.current.canSend).toBe(true)
    // so does a custom message
    act(() => result.current.setMessage('Priya shipped the migration ahead of the deadline.'))
    expect(result.current.canSend).toBe(true)
  })

  it('prefills the note with the value sentence, addressed to the recipient first name', () => {
    const { result } = setup()
    act(() => result.current.addToSel('p3')) // "Priya Menon"
    act(() => result.current.chooseValue('ownership'))
    const ownershipPrefill = VALUE_TEMPLATES['ownership'][0].prefill
    expect(result.current.message).toBe(`Priya — ${ownershipPrefill}`)
    expect(result.current.previewValue?.label).toBeTruthy()
    expect(result.current.activeTpl).toBeTruthy()
  })

  it('swaps only the prefill sentence when the value changes later', () => {
    const { result } = setup()

    act(() => result.current.chooseValue('ownership'))
    expect(result.current.message).toBe(VALUE_TEMPLATES['ownership'][0].prefill)
    // the trailing prefill is replaced in place when a new value is picked
    act(() => result.current.chooseValue('innovation'))
    expect(result.current.message).toBe(VALUE_TEMPLATES['innovation'][0].prefill)

    // a custom note stays untouched
    const custom = 'A completely personal thank you.'
    act(() => result.current.setMessage(custom))
    act(() => result.current.chooseValue('collaboration'))
    expect(result.current.message).toBe(custom)
  })

  it('aiDraft works only with recipients and fills the note with the value draft', async () => {
    vi.useFakeTimers()
    try {
      const { result } = setup()
      await act(async () => {
        result.current.aiDraft()
      })
      expect(result.current.message).toBe('')

      await act(async () => {
        result.current.addToSel('p3')
      })
      let initialDraft = ''
      await act(async () => {
        result.current.aiDraft()
      })
      initialDraft = result.current.message
      expect(initialDraft).toContain(`${AI_DRAFTS['ownership']}`)
      await act(async () => {
        vi.advanceTimersByTime(900)
      })
      expect(result.current.aiBusy).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('aiPolish ignores a short note and appends the closer to a long one', async () => {
    vi.useFakeTimers()
    try {
      const { result } = setup()

      await act(async () => {
        result.current.setMessage('short')
      })
      await act(async () => {
        result.current.aiPolish()
      })
      expect(result.current.message).toBe('short')

      await act(async () => {
        result.current.setMessage('Clean. Real impact.')
      })
      await act(async () => {
        result.current.aiPolish()
      })
      await act(async () => {
        vi.advanceTimersByTime(700)
      })
      expect(result.current.message).toContain('This made a real difference')
      expect(result.current.message).toContain('Clean. Real impact.')
    } finally {
      vi.useRealTimers()
    }
  })

  it('exposes the point presets and lets the form track template switching controls', () => {
    const { result } = setup()
    const r = result.current
    expect(r.POINT_PRESETS).toEqual([0, 25, 50, 100])
    act(() => {
      result.current.setPoints(50)
      result.current.setVariantIdx(1)
      result.current.setExpanded(true)
    })
    expect(result.current.points).toBe(50)
    expect(result.current.variantIdx).toBe(1)
    expect(result.current.expanded).toBe(true)
  })

  it('submits the composed recognition through the send lifecycle', async () => {
    const { result } = setup()
    await act(async () => {
      result.current.addToSel('p1')
      result.current.chooseValue('ownership')
      result.current.setMessage('Priya shipped the migration ahead of the deadline.')
      result.current.setPoints(25)
    })
    expect(sendRecognitionMock).not.toHaveBeenCalled()

    let sent = false
    await act(async () => {
      sent = await result.current.submit()
    })
    expect(sent).toBe(true)
    expect(sendRecognitionMock).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('sent')
  })
})

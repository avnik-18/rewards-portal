import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useComposeForm } from '@/hooks/use-compose-form'
import { PEOPLE } from '@/lib/mock-data'

const directoryPeople = Object.values(PEOPLE)
  .filter((entry) => entry.id !== 'me')
  .map((entry) => ({
    id: entry.id,
    name: entry.name,
    title: entry.title,
    email: entry.email,
    managerId: entry.managerId,
  }))

describe('useComposeForm — AI helper guards (compose hook branches)', () => {
  it('aiDraft without recipients is a no-op: no busy flag, no message', async () => {
    const { result } = renderHook(() => useComposeForm(directoryPeople))
    await act(async () => { await result.current.aiDraft() })
    expect(result.current.isBusy()).toBe(false)
    expect(result.current.message).toBe('')
  })

  it('aiPolish on a too-short note refuses to rewrite', async () => {
    const { result } = renderHook(() => useComposeForm(directoryPeople))

    await act(async () => {
      result.current.addToSel('p2')
      result.current.setMessage('short')
    })
    await act(async () => { await result.current.aiPolish() })
    expect(result.current.isBusy()).toBe(false)
    expect(result.current.message).toBe('short')
  })

  it('aiDraft with a recipient loads the styled template text', async () => {
    const { result } = renderHook(() => useComposeForm(directoryPeople))
    await act(async () => { result.current.addToSel('p2') })
    await act(async () => {
      // vi timers: aiDraft flips busy off after 800ms
      await result.current.aiDraft()
    })
    expect(result.current.message.length).toBeGreaterThan(10)
    expect(result.current.isBusy()).toBe(false)
  })

  it('aiPolish extends a real note with the thank-you close', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useComposeForm(directoryPeople))
    await act(async () => {
      result.current.setMessage('Priya shipped the migration ahead of the deadline.')
    })
    await act(async () => {
      result.current.aiPolish()
      await vi.runAllTimersAsync()
    })
    expect(result.current.message).toContain('thank you for setting the standard')
    expect(result.current.isBusy()).toBe(false)
    vi.useRealTimers()
  })
})

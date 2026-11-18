import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendRecognition } from '@/lib/data-api'

vi.mock('@/lib/api-client', () => ({
  ApiError: class ApiError extends Error {},
  apiPost: vi.fn(async () => ({
    recognition_id: 'rec-1',
    status: 'approved',
    routed_to: 0,
    approval_item_id: null,
  })),
}))

import { apiPost } from '@/lib/api-client'

const apiPostMock = apiPost as unknown as ReturnType<typeof vi.fn>

const UUID = '11111111-2222-3333-4444-555555555555'

describe('sendRecognition — live facade', () => {
  beforeEach(() => {
    apiPostMock.mockClear()
  })

  it('posts the mapped payload and resolves with the created recognition', async () => {
    const created = await sendRecognition({
      toIds: [UUID],
      valueKey: 'ownership',
      message: 'Priya shipped the migration ahead of the deadline.',
      points: 25,
    })
    expect(created.id).toBe('rec-1')
    expect(created.toIds).toEqual([UUID])
    const body = apiPostMock.mock.calls[0][1] as Record<string, unknown>
    expect(body.to_user_ids).toEqual([UUID])
    expect(body.points).toBe(25)
  })

  it('rejects non-directory (typed-email) recipients with a user-safe error', async () => {
    await expect(
      sendRecognition({
        toIds: ['somebody@emids.com'],
        valueKey: 'ownership',
        message: 'This should not go anywhere.',
        points: 0,
      }),
    ).rejects.toThrow('Typed email addresses cannot receive points')
    expect(apiPostMock).not.toHaveBeenCalled()
  })
})

import { describe, it, expect } from 'vitest'
import { sendRecognition } from '@/lib/data-api'

describe('sendRecognition smoke', () => {
  it('resolves with the created recognition', async () => {
    const created = await sendRecognition({
      toIds: ['p3'],
      valueKey: 'ownership',
      message: 'Priya shipped the migration ahead of the deadline.',
      points: 25,
    })
    expect(created.toIds).toEqual(['p3'])
  })
})

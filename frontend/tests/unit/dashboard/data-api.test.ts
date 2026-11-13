import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api-client', () => ({ apiGet: vi.fn() }))

import { apiGet } from '@/lib/api-client'
import { getMe, getDashboardStats, getLeaderboard, getShowcaseSlides } from '@/lib/data-api'
import { TEAM_LEADERBOARD, SHOWCASE_SLIDES } from '@/lib/mock-data'
import type { Mock } from 'vitest'

const apiGetMock = apiGet as unknown as Mock

describe('data-api façade', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
  })

  it('maps /me full_name to the greeting name', async () => {
    apiGetMock.mockResolvedValue({
      id: '0f5415aa-6859-46fa-9bae-e5f29a1f2b45',
      employee_code: 'EMP-0001',
      full_name: 'Ayan Mishra',
      email: 'ayan.mishra@company.com',
      role: 'individual',
    })
    await expect(getMe()).resolves.toEqual({ name: 'Ayan Mishra' })
  })

  it('merges /me/stats with the org-wide recognition count', async () => {
    apiGetMock.mockImplementation((route: string) => {
      if (route === '/me/stats') {
        return Promise.resolve({
          points_balance: 1240,
          allowance_left: null,
          allowance_allocated: null,
          recognitions_given: 3,
          recognitions_received: 4,
        })
      }
      if (route === '/recognitions/count') return Promise.resolve({ total: 5432 })
      throw new Error(`unexpected route ${route}`)
    })
    await expect(getDashboardStats()).resolves.toEqual({
      balance: 1240,
      given: 3,
      got: 4,
      orgRecognitions: 5432,
    })
  })

  it('serves the leaderboard and slides verbatim', async () => {
    await expect(getLeaderboard()).resolves.toBe(TEAM_LEADERBOARD)
    await expect(getShowcaseSlides()).resolves.toBe(SHOWCASE_SLIDES)
  })
})

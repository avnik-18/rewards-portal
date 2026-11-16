import { describe, it, expect } from 'vitest'
import { getMe, getDashboardStats, getLeaderboard, getShowcaseSlides } from '@/lib/data-api'
import { ORG_STATS, SHOWCASE_SLIDES } from '@/lib/mock-data'

describe('data-api façade', () => {
  it('serves the signed-in person from GET /me', async () => {
    await expect(getMe()).resolves.toEqual({
      employee_code: 'E-PR',
      full_name: 'Ayan',
      email: 'priya@emids.test',
      role: 'individual',
      title: 'Engineer',
      department: 'Engineering',
    })
  })

  it('merges /me/stats figures with the org-wide recognitions count', async () => {
    await expect(getDashboardStats()).resolves.toEqual({
      balance: 1240,
      given: 3,
      got: 4,
      orgRecognitions: ORG_STATS.recognitions,
    })
  })

  it('maps the live leaderboard with the caller pinned first, top-5 cap', async () => {
    await expect(getLeaderboard()).resolves.toEqual([
      { id: 'live-2', name: 'Ayan', pts: 380, me: true },
      { id: 'live-1', name: 'Daniel C.', pts: 420, me: false },
      { id: 'live-3', name: 'Aarav S.', pts: 275, me: false },
      { id: 'live-4', name: 'Priya M.', pts: 250, me: false },
      { id: 'live-5', name: 'Kenji W.', pts: 220, me: false },
    ])
  })

  it('composes the first showcase slide from the live EoQ numbers', async () => {
    const slides = await getShowcaseSlides()
    expect(slides[0]).toEqual({
      key: 'eoq-live',
      img: '/img2.webp',
      title: 'EoQ window · close in 19 days',
      headline: 'Awards worth 7500 pts this quarter',
      blurb:
        'Nominate the teammate who shipped, saved, and showed up. The jury reads every word. You can nominate anyone.',
      cta: 'Nominate now',
      cta2: 'Open',
    })
    expect(slides.length).toBe(SHOWCASE_SLIDES.length) // the mock award slides follow
  })
})

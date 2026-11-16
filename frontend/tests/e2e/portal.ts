import { test as base, expect } from '@playwright/test'

/**
 * Shared e2e entry: every spec drives the gated portal, so the fixture
 * pre-picks the demo identity (the route guard passes without exercising
 * the login screen) and answers the api calls CI has no backend for.
 * import { test, expect } from './portal'
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('applause-demo-user', 'E-PR')
    })
    await page.route('**/api/v1/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          employee_code: 'E-PR',
          full_name: 'Priya Rao',
          email: 'priya@emids.test',
          role: 'individual',
          title: 'Engineer',
          department: 'Engineering',
        }),
      }),
    )
    await page.route('**/api/v1/auth/demo-users', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { employee_code: 'E-009', full_name: 'Deepa Menon', title: 'Program Admin', department: 'People' },
          { employee_code: 'E-BR', full_name: 'Brooke Davis', title: 'Executive Assistant', department: 'Operations' },
          { employee_code: 'E-PR', full_name: 'Priya Rao', title: 'Engineer', department: 'Engineering' },
        ]),
      }),
    )
    // API-fed tiles CI has no backend for: count/stats/showcase/leaderboard/bell
    await page.route('**/api/v1/recognitions/count', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ total: 279 }) }),
    )
    await page.route('**/api/v1/me/stats', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ points_balance: 1240, recognitions_given: 3, recognitions_received: 4 }),
      }),
    )
    await page.route('**/api/v1/leaderboard?*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          entries: [
            { rank: 1, name: 'Daniel C.', points: 420, is_me: false },
            { rank: 2, name: 'Rahul Nair', points: 380, is_me: true },
            { rank: 3, name: 'Erica Stone', points: 275, is_me: false },
          ],
        }),
      }),
    )
    await page.route('**/api/v1/awards/showcase', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          // the seeded nominations_end (seed/demo.sql) — the countdown drifts
          // with the calendar, so the fixture computes it instead of freezing
          days_to_nominations_close: Math.max(0, Math.round((Date.UTC(2026, 11, 5) - Date.now()) / 86_400_000)),
          open_categories: 3,
          cycle_prize_total: 7500,
          my_jury: { cast: false, assigned: false },
        }),
      }),
    )
    await page.route('**/api/v1/notifications/unread-count', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ unread_count: 3 }) }),
    )
    await page.route('**/api/v1/notifications', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'n-1',
            type: 'praise',
            giver_name: 'Brooke Davis',
            points: 50,
            message: 'Great release support.',
            created_at: '2026-11-16T09:00:00Z',
          },
        ]),
      }),
    )
    await page.route('**/api/v1/media/hero', (route) =>
      route.fulfill({ status: 404, contentType: 'application/json', body: '{"detail":"hero_not_published"}' }),
    )
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright fixture teardown fn, not a React hook
    await use(page)
  },
})

export { expect }

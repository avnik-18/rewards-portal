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
          full_name: 'Ayan',
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
    await page.route('**/api/v1/feed', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          persona: 'employee',
          items: [
            {
              recognition_id: 'fd1',
              tier: 'own',
              occurred_at: new Date().toISOString(),
              giver_id: 'u2',
              giver_name: 'Marco Silva',
              giver_avatar: null,
              kind: 'praise',
              message: 'Fixed the claims pipeline outage before standup.',
              points: 50,
              value_label: 'Ownership',
              recipients: [{ user_id: 'u1', name: 'Ayan', points: 50, kind: 'to' }],
            },
          ],
          next_cursor: null,
        }),
      }),
    )
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright fixture teardown fn, not a React hook
    await use(page)
  },
})

export { expect }

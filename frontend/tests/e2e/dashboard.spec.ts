import { test, expect } from './portal'

test.describe('Dashboard (Playwright integration)', () => {
  // CI has no backend: answer the live-data calls in-test so the stat strip
  // can resolve; other unknown endpoints degrade to their mock values.
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/recognitions/count', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ total: 279 }) }),
    )
  })

  test('greets the user and shows the full dashboard', async ({ page }) => {
    await page.goto('/')

    // header carries the logo link — scope to the banner
    await expect(page.getByRole('banner').getByRole('link', { name: 'Go to dashboard' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hello Ayan')
    await expect(page.getByRole('link', { name: 'Recognize a teammate' })).toBeVisible()

    // stat strip
    await expect(page.getByText('Total points balance')).toBeVisible()
    await expect(page.getByText('Recognitions given')).toBeVisible()
    await expect(page.getByText('Recognitions received')).toBeVisible()

    // leaderboard — the You chip sits on the signed-in person's row
    await expect(page.getByText('Team leaderboard')).toBeVisible()
    await expect(page.getByText('Daniel C.')).toBeVisible()
    await expect(page.getByText('You', { exact: true })).toBeVisible()

    // right rail closing card
    await expect(page.getByText(/Awards worth 7,500 pts/)).toBeVisible()
  })

  test('feed tabs filter to an empty state', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('tab', { name: 'All' })).toBeVisible()
    await page.getByRole('tab', { name: 'Polls' }).click()
    await expect(page.getByText('Nothing here yet')).toBeVisible()
  })

  test('dashboard renders fully once the api-backed tiles resolve', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.ok()).toBeTruthy()
    // the tiles are api-fed now — assert with Playwright's auto-waiting
    // locators instead of racing page.content() against the fetches
    await expect(page.getByText('Total points balance')).toBeVisible()
    await expect(page.getByText('Recognitions received')).toBeVisible()
  })
})

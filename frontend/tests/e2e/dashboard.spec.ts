import { test, expect } from './portal'

test.describe('Dashboard (Playwright integration)', () => {
  // CI has no backend: answer the two live-data calls in-test. Anything the
  // backend isn't serving yet stays 404 (hero falls back to the static asset).
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/recognitions/count', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ total: 279 }) }),
    )
    await page.route('**/api/v1/media/hero', (route) =>
      route.fulfill({ status: 404, contentType: 'application/json', body: '{"detail":"hero_not_published"}' }),
    )
  })

  test('greets the user and shows the full server-rendered dashboard', async ({ page }) => {
    await page.goto('/')

    // header and footer both carry the logo link — scope to the header
    await expect(page.getByRole('banner').getByRole('link', { name: 'Go to dashboard' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hello Priya Rao')
    await expect(page.getByRole('link', { name: 'Recognize a teammate' })).toBeVisible()

    // stat tiles
    await expect(page.getByText('Total points balance')).toBeVisible()
    await expect(page.getByText('Recognitions given')).toBeVisible()
    await expect(page.getByText('Milestone achieved')).toBeVisible()

    // leaderboard — top rank row renders with the You chip on rank 2
    await expect(page.getByText('Team leaderboard')).toBeVisible()
    await expect(page.getByText('Daniel C.')).toBeVisible()
    await expect(page.getByText('You', { exact: true })).toBeVisible()
  })

  test('carousel next arrow shows the awards slide and dots navigate', async ({ page }) => {
    await page.goto('/')

    // the LIVE first slide composes from GET /awards/showcase (headline w/o comma)
    await expect(page.getByText(/Awards worth 7500 pts/)).toBeVisible()

    // the slider's cross-fade layers can win the hit-test mid-transition on touch
    // viewports — fall back to a forced click on our own control
    const nextBtn = page.getByRole('button', { name: 'Next slide' })
    await nextBtn.click().catch(() => nextBtn.click({ force: true }))
    // the mock Quarterly Awards slide follows (headline keeps its comma)
    await expect(page.getByText(/7,500 pts/)).toBeVisible()

    // the pinned-first card keeps API ranks: Daniel leads by rank, the
    // caller's true rank-2 row is pinned up top (badge '2', chip 'You')
    await expect(page.getByText('Team leaderboard')).toBeVisible()
    await expect(page.getByText('Daniel C.')).toBeVisible()
    await expect(page.getByText('You', { exact: true })).toBeVisible()

    // nav dots carry the same aria labels as every request — pick the unique
    // one (the day count drifts with the calendar, so match on the prefix)
    const dot = page.getByRole('button', { name: /Go to EoQ window · close in/ })
    await dot.click().catch(() => dot.click({ force: true }))
    await expect(page.getByText(/Awards worth 7500 pts/)).toBeVisible()
  })

  test('dashboard renders fully once the api-backed tiles resolve', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.ok()).toBeTruthy()
    // the tiles are api-fed now — assert with Playwright's auto-waiting
    // locators instead of racing page.content() against the fetches
    await expect(page.getByText('Total points balance')).toBeVisible()
    await expect(page.getByText('Total recognitions at EMIDS')).toBeVisible()
  })
})

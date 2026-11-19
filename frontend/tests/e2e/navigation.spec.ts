import { test, expect } from './portal'

test.describe('Primary navigation (Playwright integration)', () => {
  // the approved design carries exactly three nav items — Recognize and
  // Approvals are reached from the flows, not the navbar
  for (const [label, path, heading] of [
    ['My Team', '/team', 'My Team'],
    ['My Rewards', '/rewards', 'My Rewards'],
  ] as const) {
    test(`${label} opens ${path} from the primary nav`, async ({ page }) => {
      await page.goto('/')
      await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: label }).click()
      await expect(page).toHaveURL(new RegExp(path.replace(/\//g, '\\/') + '$'))
      await expect(page.getByRole('heading', { level: 1 })).toContainText(heading as string)
    })
  }

  test('nav has no Recognize or Approvals entries (3-item ditto)', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Primary' })
    await expect(nav.getByRole('link', { name: 'Recognize' })).toHaveCount(0)
    await expect(nav.getByRole('link', { name: 'Approvals' })).toHaveCount(0)
    await expect(nav.getByRole('link', { name: 'My Team' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'My Rewards' })).toBeVisible()
  })
})

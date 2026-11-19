import { test, expect } from './portal'

test.describe('Approvals flow (Playwright integration)', () => {
  test('approve the selected request and see the verdict pill', async ({ page }) => {
    await page.goto('/approvals')

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Approvals inbox')
    await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible()

    await page.getByRole('button', { name: 'Approve' }).click()
    await expect(page.getByText('Approved', { exact: true }).first()).toBeVisible()
  })

  test('history folder fills up after a decision', async ({ page }) => {
    await page.goto('/approvals')

    await page.getByRole('button', { name: 'Approve' }).click()
    await page.getByRole('button', { name: /History/ }).click()
    await expect(page.getByText(/Recorded/)).toBeVisible()
  })
})

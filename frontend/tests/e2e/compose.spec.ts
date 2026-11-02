import { test, expect } from '@playwright/test'

test.describe('Compose flow (Playwright integration)', () => {
  test('full parity flow: pick person, value, note, points, post', async ({ page }) => {
    await page.goto('/recognize')

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Recognize your/)

    // To: type into the search, pick the suggestion
    await page.getByPlaceholder('Whom do you want to recognise?').fill('priya')
    await page.getByRole('button', { name: /Priya Menon/ }).click()
    await expect(page.getByText('Priya', { exact: true })).toBeVisible()

    // value chip requires before send
    await page.getByRole('button', { name: 'Ownership' }).click()

    // note
    await page
      .getByPlaceholder('What made them stand out?')
      .fill('Priya shipped the migration ahead of the deadline — great catch.')
    await page.getByRole('button', { name: '+25' }).click()

    // send and see the confirmation strip
    await page.getByRole('button', { name: /Post it/ }).click()
    await expect(page.getByText(/Recognition sent to Priya/)).toBeVisible()
    await expect(page.getByText('+25 pts').first()).toBeVisible()
  })

  test('blocks Post it until To + value + note exist', async ({ page }) => {
    await page.goto('/recognize')

    const send = page.getByRole('button', { name: /Post it/ })
    await expect(send).toBeDisabled()
  })
})

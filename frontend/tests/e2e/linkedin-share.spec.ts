import { test, expect } from '@playwright/test'

const TIP = 'Share your achievement on LinkedIn.'

test('the share button on My Rewards opens the LinkedIn share page in a new tab', async ({ page }) => {
  await page.goto('/rewards')

  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: TIP }).first().click(),
  ])

  expect(popup.url()).toContain('https://www.linkedin.com')
  // signed-out visitors land on LinkedIn's login wall, which carries the share
  // intent (…/shareArticle?url=<double-encoded recognition page>) — that is how
  // the share-offsite hand-off behaves, so assert on the carried redirect
  expect(decodeURIComponent(decodeURIComponent(popup.url()))).toContain('recognition.company.com/recognition/rc1')
})

test('private recognitions show no share button', async ({ page }) => {
  await page.goto('/rewards')
  // rc3 is the only non-shareable seeded record — exactly RECEIVED.length - 1 buttons
  await expect(page.getByRole('button', { name: TIP })).toHaveCount(2)
})

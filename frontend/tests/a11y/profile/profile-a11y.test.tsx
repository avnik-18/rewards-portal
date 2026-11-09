import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import axe from 'axe-core'
import ProfilePage from '@/profile/page'

async function scan(element: HTMLElement) {
  const { violations } = (await axe.run(element)) as { violations: unknown[] }
  return violations
}

vi.setConfig({ testTimeout: 15_000 })

describe('accessibility (axe-core) — profile page', () => {
  it('the profile screen has no a11y violations', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/profile?id=p1']}>
        <ProfilePage />
      </MemoryRouter>,
    )
    // the header mounts in one commit once the mock data hook resolves
    await screen.findByRole('heading', { name: /Aarav Sharma/ })
    expect(await scan(container)).toHaveLength(0)
  })
})

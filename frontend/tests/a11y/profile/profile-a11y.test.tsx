import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import axe from 'axe-core'
import ProfilePage from '@/app/profile/page'

async function scan(element: HTMLElement) {
  const { violations } = (await axe.run(element)) as { violations: unknown[] }
  return violations
}

describe('accessibility (axe-core) — profile page', () => {
  it('the profile screen has no a11y violations', async () => {
    const pageElement = await ProfilePage({ searchParams: Promise.resolve({ id: 'p1' }) as never })
    const { container } = render(pageElement as never)
    expect(await scan(container)).toHaveLength(0)
  })
})

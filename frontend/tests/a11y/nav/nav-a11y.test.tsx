import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import axe from 'axe-core'
import PrimaryNav from '@/components/organisms/primary-nav'

async function scan(element: HTMLElement) {
  const { violations } = (await axe.run(element)) as { violations: unknown[] }
  return violations
}

vi.setConfig({ testTimeout: 15_000 })

describe('accessibility (axe-core) — navigation', () => {
  it('primary nav has no a11y violations', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <PrimaryNav />
      </MemoryRouter>,
    )
    expect(await scan(container)).toHaveLength(0)
  })
})

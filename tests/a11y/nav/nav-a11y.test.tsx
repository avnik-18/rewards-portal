import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import axe from 'axe-core'
import PrimaryNav from '@/components/organisms/PrimaryNav'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))

async function scan(element: HTMLElement) {
  const { violations } = (await axe.run(element)) as { violations: unknown[] }
  return violations
}

describe('accessibility (axe-core) — navigation', () => {
  it('primary nav has no a11y violations', async () => {
    const { container } = render(<PrimaryNav />)
    expect(await scan(container)).toHaveLength(0)
  })
})

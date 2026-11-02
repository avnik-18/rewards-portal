import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import axe from 'axe-core'
import ApprovalsBoard from '@/components/organisms/ApprovalsBoard'
import { APPROVALS } from '@/lib/mock-data'

async function scan(element: HTMLElement) {
  const { violations } = (await axe.run(element)) as { violations: unknown[] }
  return violations
}

describe('accessibility (axe-core) — approvals', () => {
  it('board has no automatic a11y violations', async () => {
    const { container } = render(<ApprovalsBoard items={APPROVALS} />)
    expect(await scan(container)).toHaveLength(0)
  })

  it('board with empty folders has no a11y violations', async () => {
    const { container } = render(<ApprovalsBoard items={[]} />)
    expect(await scan(container)).toHaveLength(0)
  })
})

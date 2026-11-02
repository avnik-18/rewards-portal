import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import axe from 'axe-core'
import RewardsBalanceHero from '@/components/organisms/RewardsBalanceHero'
import RecognitionsReceived, { RewardsLedger } from '@/components/organisms/RewardsSections'
import { LEDGER, RECEIVED, REWARDS_SUMMARY } from '@/lib/mock-data'

async function scan(element: HTMLElement) {
  const { violations } = (await axe.run(element)) as { violations: unknown[] }
  return violations
}

describe('accessibility (axe-core) — rewards', () => {
  it('balance hero has no a11y violations', async () => {
    const { container } = render(<RewardsBalanceHero summary={REWARDS_SUMMARY} />)
    expect(await scan(container)).toHaveLength(0)
  })

  it('received list and ledger have no a11y violations', async () => {
    const { container } = render(
      <main>
        <RecognitionsReceived items={RECEIVED} />
        <RewardsLedger entries={LEDGER} />
      </main>,
    )
    const violations = await scan(container)
    expect(violations).toHaveLength(0)
  })
})

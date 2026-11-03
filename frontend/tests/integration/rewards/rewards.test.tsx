import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import RewardsBalanceHero from '@/components/organisms/RewardsBalanceHero'
import RecognitionsReceived, { RewardsLedger } from '@/components/organisms/RewardsSections'
import { LEDGER, RECEIVED, REWARDS_SUMMARY, person } from '@/lib/mock-data'

import { fireEvent as fe } from '@testing-library/react'
import type { LedgerEntry } from '@/lib/mock-data'

const heroTheme = { summary: REWARDS_SUMMARY }

describe('RewardsBalanceHero', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('animates to the balance and shows the lifetime breakdown', async () => {
    const { getByText } = render(<RewardsBalanceHero {...heroTheme} />)

    await waitFor(
      () => {
        expect(screen.getByText('1,240')).toBeTruthy()
      },
      { timeout: 3000 },
    )
    expect(getByText('Total reward balance')).toBeTruthy()
    expect(getByText('4,460')).toBeTruthy()
    expect(getByText('Awards')).toBeTruthy()
  })

  it('view-ledger button scrolls to the ledger section', async () => {
    const scrollIntoView = vi.fn()
    const originalGetElementById = document.getElementById
    // the hero page mounts the ledger elsewhere; emulate a reachable target
    document.getElementById = ((id: string) =>
      id === 'ledger' ? { scrollIntoView } : null) as typeof document.getElementById
    render(<RewardsBalanceHero {...heroTheme} />)

    fe.click(screen.getByRole('button', { name: /view ledger/i }))
    expect(scrollIntoView).toHaveBeenCalled()
    document.getElementById = originalGetElementById
  })
})

describe('RecognitionsReceived', () => {
  it('lists senders, blurbs and value badges', () => {
    render(<RecognitionsReceived items={RECEIVED} />)

    for (const rc of RECEIVED) {
      expect(screen.getByText(person(rc.fromId)?.name ?? 'Unknown')).toBeTruthy()
      expect(screen.getByText(rc.message)).toBeTruthy()
    }
    // rc3's plain card shows its badge; valueless rc2 stays badge-free
    expect(screen.getAllByText(/Ownership|Customer first/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Ownership|Customer first/i).length).toBeLessThan(RECEIVED.length)
  })

  it('handles an empty list without crashing', () => {
    const { container } = render(<RecognitionsReceived items={[]} />)
    expect(container).toBeTruthy()
  })
})

describe('RewardsLedger', () => {
  it('renders every ledger row with kind labels and signed amounts', () => {
    render(<RewardsLedger entries={LEDGER} />)

    expect(screen.getByText('Redeemed · Bookstore catalogue')).toBeTruthy()
    expect(screen.getByText('EoQ Q3 · Data Steward award')).toBeTruthy()
    // debits render negative, credits prefixed with +
    expect(screen.getByText('-500')).toBeTruthy()
    expect(screen.getByText('+750')).toBeTruthy()
    expect(screen.getAllByText(/Award|Grant|Peer earning|Redemption/).length).toBeGreaterThan(0)
  })

  it('shows empty copy for an empty ledger', () => {
    render(<RewardsLedger entries={[] as LedgerEntry[]} />)
    expect(screen.getByText('No ledger entries yet.')).toBeTruthy()
  })
})

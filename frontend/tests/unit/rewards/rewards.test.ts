import { describe, it, expect } from 'vitest'
import { netPoints, splitLedger, ledgerKindLabel } from '@/lib/rewards'
import { LEDGER, REWARDS_SUMMARY } from '@/lib/mock-data'

describe('netPoints', () => {
  it('sums credits minus debits across the ledger', () => {
    expect(netPoints(LEDGER)).toBe(1300) // 750+60+90+400+500-500
  })

  it('is 0 for an empty ledger', () => {
    expect(netPoints([])).toBe(0)
  })
})

describe('splitLedger', () => {
  it('partitions credits and debits', () => {
    const { credits, debits } = splitLedger(LEDGER)
    expect(credits.every((e) => e.amount >= 0)).toBe(true)
    expect(debits.every((e) => e.amount < 0)).toBe(true)
    expect(credits.length + debits.length).toBe(LEDGER.length)
  })
})

describe('ledgerKindLabel', () => {
  it('maps every ledger kind to a human label', () => {
    expect(ledgerKindLabel('award')).toBe('Award')
    expect(ledgerKindLabel('redemption')).toBe('Redemption')
  })
})

describe('rewards invariants', () => {
  it('balance is never negative and lifetime >= breakdown sum', () => {
    const { balance, earnedLifetime, breakdown } = REWARDS_SUMMARY
    expect(balance).toBeGreaterThanOrEqual(0)
    expect(earnedLifetime).toBe(breakdown.awards + breakdown.grants + breakdown.milestones)
  })
})

import { describe, it, expect } from 'vitest'
import { kindLabel, openSteps, isActionable, filterForTab } from '@/lib/approval'
import { APPROVALS } from '@/lib/mock-data'

describe('kindLabel', () => {
  it('labels points approvals with the amount', () => {
    expect(kindLabel('points-approval', 50)).toBe('Points approval · +50 pts')
  })
  it('labels endorsements and redemptions without amounts', () => {
    expect(kindLabel('nomination-endorsement')).toBe('Nomination endorsement')
    expect(kindLabel('high-value-redemption')).toBe('High-value redemption')
  })
})

describe('openSteps', () => {
  it('keeps only undecided steps in routing order', () => {
    const route = [
      { step: 'Direct manager', owner: 'me', done: true },
      { step: 'Cost-centre head', owner: 'Kavita Nair', done: false },
    ]
    expect(openSteps(route)).toEqual([{ step: 'Cost-centre head', owner: 'Kavita Nair', done: false }])
  })
})

describe('isActionable', () => {
  it('is true when the next open step belongs to the viewer', () => {
    const live = APPROVALS.find((a) => a.id === 'ap2')!
    expect(isActionable(live)).toBe(true)
  })
  it('is false when another owner is next or all steps are done', () => {
    const waiting = APPROVALS.find((a) => a.id === 'ap4')!
    // only the cost-centre step remains, and it is not the viewer's
    expect(isActionable({ ...waiting })).toBe(false)
  })
})

describe('filterForTab', () => {
  const decided = { ap4: 'approved' as const }
  it('inbox shows undecided non-endorsements', () => {
    expect(filterForTab(APPROVALS, 'inbox', decided).map((a) => a.id)).toEqual(['ap2', 'ap1'])
  })
  it('endorse shows only undecided endorsements', () => {
    expect(filterForTab(APPROVALS, 'endorse', decided).map((a) => a.id)).toEqual(['ap3'])
  })
  it('done shows every decided item', () => {
    expect(filterForTab(APPROVALS, 'done', decided).map((a) => a.id)).toEqual(['ap4'])
  })
})

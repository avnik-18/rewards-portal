import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { render, screen, fireEvent } from '@testing-library/react'
import { useApprovals } from '@/hooks/use-approvals'
import { prefillUpdate, activeTemplateFor, personLabel } from '@/lib/compose'
import { VALUE_TEMPLATES, APPROVALS, type PraiseTemplate } from '@/lib/mock-data'
import ApprovalsBoard from '@/components/organisms/ApprovalsBoard'
import ApprovalListItem from '@/components/molecules/ApprovalListItem'
import ApprovalDetail from '@/components/organisms/approval-detail'
import { kindLabel, isActionable } from '@/lib/approval'
import type { ApprovalItem } from '@/lib/data-api'

describe('useApprovals — unknown ids are ignored', () => {
  it('decide() rejects an id that is not in the list, never records it', () => {
    const { result } = renderHook(() => useApprovals(APPROVALS))
    act(() => result.current.decide('ghost-9', 'approved'))
    expect(result.current.decided).toEqual({})

    const real = APPROVALS[0]
    act(() => result.current.decideItem(real, 'approved'))
    expect(result.current.decided[real.id]?.verdict).toBe('approved')
  })
})

describe('compose.ts helpers — remaining branches', () => {
  const ownership: PraiseTemplate = VALUE_TEMPLATES['ownership'][0]

  it('prefillUpdate: trailing prefill with no next template leaves the note alone', () => {
    const note = `Great work. ${ownership.prefill}`
    expect(prefillUpdate({ message: note, prevTemplate: ownership, nextTemplate: null, firstName: 'Priya' })).toBe(note)
  })

  it('prefillUpdate: trailing prefill swaps in place to the next template', () => {
    const next = VALUE_TEMPLATES['innovation'][0]
    const note = `Shipped early. ${ownership.prefill}`
    expect(prefillUpdate({ message: note, prevTemplate: ownership, nextTemplate: next, firstName: null })).toBe(
      `Shipped early. ${next.prefill}`,
    )
  })

  it('prefillUpdate: empty note with no recipient renders the bare prefill', () => {
    expect(prefillUpdate({ message: '', prevTemplate: null, nextTemplate: ownership, firstName: null })).toBe(
      ownership.prefill,
    )
  })

  it('activeTemplateFor: null value ⇒ null, unknown tplId falls back to the first template', () => {
    expect(activeTemplateFor(null, null)).toBeNull()
    const fallback = activeTemplateFor('ownership', 'no-such-template')
    expect(fallback?.id).toBe(ownership.id)
    expect(activeTemplateFor('ownership', ownership.id)?.id).toBe(ownership.id)
  })

  it('personLabel falls back to the raw id when there is no person behind it', () => {
    expect(personLabel('ghost-1', {})).toBe('ghost-1')
  })
})

describe('approve list edge items', () => {
  it('ApprovalListItem renders an unknown sender as "Unknown teammate", never the raw id', () => {
    const ghost = { ...APPROVALS[0], id: 'rc-ghost', fromId: 'who-10', title: 'Ghost sender check' } as ApprovalItem
    render(<ApprovalListItem item={ghost} selected={false} onSelect={() => {}} />)
    // the meta line reads "Unknown teammate · <when>" — match by substring
    expect(screen.getByText(/Unknown teammate/)).toBeTruthy()
  })

  it('an empty inbox shows the Inbox zero copy, not an empty list', () => {
    render(<ApprovalsBoard items={[]} />)
    expect(screen.getByText('Inbox zero')).toBeTruthy()
  })

  it('a decided item shows the audit-trail recorded line in the reading pane', () => {
    render(<ApprovalsBoard items={APPROVALS} />)
    // auto-selected first request; record a decision and expect the Recorded line
    fireEvent.click(screen.getByText('Approve'))
    expect(screen.getByText(/Recorded .*audit trail/)).toBeTruthy()
  })

  it("an approval routed to someone else shows 'Waiting on <owner>', no action buttons", () => {
    const routedItem = APPROVALS.find((candidate) => !isActionable(candidate)) ?? APPROVALS[0]
    render(<ApprovalDetail item={routedItem} onDecide={() => {}} viewerId="nobody-else" />)

    expect(screen.getByText(/Waiting on/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Next time' })).toBeNull()
  })

  it('kindLabel drops the pts suffix when a points approval has no points value', () => {
    expect(kindLabel('points-approval')).toBe('Points approval')
    expect(kindLabel('nomination-endorsement')).toBe('Nomination endorsement')
  })
})

export {}

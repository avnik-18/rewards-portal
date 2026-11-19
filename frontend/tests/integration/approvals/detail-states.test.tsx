import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ApprovalDetail from '@/components/organisms/approval-detail'
import type { ApprovalItem } from '@/lib/data-api'

const actionableItem: ApprovalItem = {
  id: 'apx',
  kind: 'points-approval',
  fromId: 'p2',
  points: 50,
  when: '2h ago',
  title: 'Daniel wants to award +50 pts to Priya',
  detail: '"Priya pulled the quarterly data pack."',
  toIds: ['p3'],
  artUrl: '/xoxo/customer_first_01.webp',
  route: [{ step: 'manager signoff', owner: 'me', done: false }],
  budget: 'team pool',
}

const plainItem: ApprovalItem = { ...actionableItem, id: 'ap-plain', artUrl: undefined, fromId: 'no-such-person' }

describe('ApprovalDetail — decision-note branches (sir round 1)', () => {
  it('keeps Next time disabled until the note has content, then ships it with the verdict', () => {
    const onDecide = vi.fn()
    const { container } = render(<ApprovalDetail item={actionableItem} viewerId="me" onDecide={onDecide} />)

    const noteField = container.querySelector<HTMLInputElement>('input[aria-label="Decision note"]')
    const buttons = Array.from(container.querySelectorAll('button'))
    const approve = buttons.find((button) => button.textContent === 'Approve')
    const nextTime = buttons.find((button) => button.textContent === 'Next time')
    if (!approve || !nextTime || !noteField) throw new Error('decision controls not rendered')
    expect(nextTime!.hasAttribute('disabled')).toBe(true)

    fireEvent.change(noteField!, { target: { value: 'rework the deck' } })
    expect(nextTime!.hasAttribute('disabled')).toBe(false)

    fireEvent.click(nextTime)
    expect(onDecide).toHaveBeenCalledWith('declined', 'rework the deck')
    // the note is consumed once recorded, never left behind
    expect(noteField.value).toBe('')
  })

  it('Approve clears the typed note after recording', () => {
    const onDecide = vi.fn()
    const { container } = render(<ApprovalDetail item={actionableItem} viewerId="me" onDecide={onDecide} />)
    const noteField = container.querySelector<HTMLInputElement>('input[aria-label="Decision note"]')
    const approve = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Approve')

    fireEvent.change(noteField!, { target: { value: 'goes ahead as asked' } })
    if (approve) fireEvent.click(approve!)
    expect(onDecide).toHaveBeenCalledWith('approved', 'goes ahead as asked')
    expect(noteField?.value).toBe('')
  })

  it('once decided, the pill replaces the actions', () => {
    render(<ApprovalDetail item={actionableItem} viewerId="me" onDecide={vi.fn()} verdict="declined" />)
    const buttons = Array.from(document.querySelectorAll('button')).map((button) => button.textContent)
    expect(buttons).not.toContain('Approve')
    expect(buttons).not.toContain('Next time')
    expect(screen.getByText('Next time')).toBeTruthy()
    expect(screen.getByText(/Recorded .*audit trail/)).toBeTruthy()
  })

  it('a viewer further down the route sees whose turn it is', () => {
    const { container } = render(<ApprovalDetail item={actionableItem} viewerId="vp" onDecide={vi.fn()} />)
    expect(container.textContent).toContain('Waiting on me before your step')
    expect(container.querySelector('input[aria-label="Decision note"]')).toBeNull()
  })

  it('unknown senders and postcards render the plain fallback paths', () => {
    const { container } = render(<ApprovalDetail item={plainItem} viewerId="someone-else" onDecide={vi.fn()} />)
    expect(container.textContent).toContain('Unknown teammate')
    expect(container.textContent).toContain('Priya pulled the quarterly data pack.')
  })
})

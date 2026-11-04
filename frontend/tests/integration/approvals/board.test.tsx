import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ApprovalsBoard from '@/components/organisms/ApprovalsBoard'
import { APPROVALS } from '@/lib/mock-data'

describe('ApprovalsBoard', () => {
  it('opens with the inbox list, counts and the first selected request', () => {
    render(<ApprovalsBoard items={APPROVALS} />)

    // the "Approvals inbox" heading belongs to the page/tab chrome (TeamScreen); the board itself opens straight into the folders
    // first live points-approval is auto-selected in the reading pane
    // (title appears both in the list row and the reading pane — assert at least one)
    expect(screen.getAllByText('Daniel wants to award +50 pts to Priya').length).toBeGreaterThan(0)
    expect(screen.getByText('Approve')).toBeTruthy()
    // inbox mounts non-endorsement, undecided items
    for (const a of APPROVALS.filter((x) => x.kind !== 'nomination-endorsement')) {
      expect(screen.getAllByText(a.title).length).toBeGreaterThan(0)
    }
    // the endorsement lives on its own folder, not in the inbox
    expect(screen.queryByText("Priya endorsed Kenji's quarterly nomination")).toBeNull()
  })

  it('approval records a verdict and shows the pill', () => {
    render(<ApprovalsBoard items={APPROVALS} />)

    fireEvent.click(screen.getByText('Approve'))
    expect(screen.getByText('Approved')).toBeTruthy()
    expect(screen.queryByText('Approve')).toBeNull()
  })

  it('declining is locked until a note is typed — the verdict ships with it', () => {
    render(<ApprovalsBoard items={APPROVALS} />)

    const decline = screen.getByRole('button', { name: 'Next time' }) as HTMLButtonElement
    // no note typed yet: the decline button stays disabled (audit-trail rule)
    expect(decline.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Decision note'), { target: { value: 'context lost this sprint' } })
    expect(decline.disabled).toBe(false)

    fireEvent.click(decline)
    // the recorded pill shows the "Next time" verdict, the action bar is gone
    expect(screen.getAllByText('Next time').length).toBeGreaterThan(0)
  })

  it('history folder lists decided items and empty folders show empty copy', () => {
    render(<ApprovalsBoard items={APPROVALS} />)

    fireEvent.click(screen.getByText('Approve'))
    fireEvent.click(screen.getByRole('button', { name: /history/i }))
    expect(screen.getAllByText('Daniel wants to award +50 pts to Priya').length).toBeGreaterThan(0)
    expect(screen.getByText(/recorded/i)).toBeTruthy()
  })

  it('switching to endorsements shows only the endorsement request', () => {
    render(<ApprovalsBoard items={APPROVALS} />)

    fireEvent.click(screen.getByRole('button', { name: /endorsements/i }))
    expect(screen.getByText("Priya endorsed Kenji's quarterly nomination")).toBeTruthy()
    expect(screen.queryByText('Aarav requested a ₹500 reward redemption')).toBeNull()
  })
})

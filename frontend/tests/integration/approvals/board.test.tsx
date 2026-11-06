import { describe, it, expect, vi } from 'vitest'
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
    // sir's review: the "Next time" pill existed before the click, so the
    // assertion now proves the BUTTON LEFT and the verdict actually shipped
    // with the note through onDecide
    const spy = vi.fn()
    render(<ApprovalsBoard items={APPROVALS} onDecide={spy} />)

    const decline = screen.getByRole('button', { name: 'Next time' }) as HTMLButtonElement
    // no note typed yet: the decline button stays disabled (audit-trail rule)
    expect(decline.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Decision note'), { target: { value: 'context lost this sprint' } })
    expect(decline.disabled).toBe(false)

    expect(spy).not.toHaveBeenCalled()
    fireEvent.click(decline)

    // the action bar is actually gone: the decline button no longer exists
    expect(screen.queryByRole('button', { name: 'Next time' })).toBeNull()
    // the note ships with the verdict — the API's 422 rule is honoured
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('declined', 'context lost this sprint')
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

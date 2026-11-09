import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MemberInfoModal from '@/components/organisms/member-info-modal'
import type { TeamRow } from '@/lib/data-api'

const row: TeamRow = {
  id: 'p1',
  given: 3,
  received: 5,
  lastRecognized: '— 2 days',
  valuesTop: 'ownership',
  team: 'humana',
}

const base = {
  onClose: vi.fn(),
  onOpenProfile: vi.fn(),
  onPraise: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('MemberInfoModal', () => {
  it('stays unmounted when no row is open', () => {
    render(<MemberInfoModal viewRow={null} {...base} />)
    expect(screen.queryByRole('dialog', { name: 'Team member info' })).toBeNull()
  })

  it('shows the person card, quarter stats and the primary-value chip', () => {
    render(<MemberInfoModal viewRow={row} {...base} />)
    const dlg = screen.getByRole('dialog', { name: 'Team member info' })
    expect(dlg.textContent).toContain('Aarav Sharma')
    expect(screen.getByText('Recognitions received')).toBeTruthy()
    expect(screen.getByText('Recognitions given')).toBeTruthy()
    // the row's top value renders as a chip
    expect(screen.getAllByText('Ownership').length).toBeGreaterThan(0)
  })

  it('the Full profile button closes the modal and hands the id to the profile route', () => {
    render(<MemberInfoModal viewRow={row} {...base} />)

    fireEvent.click(screen.getByRole('button', { name: 'Full profile' }))
    expect(base.onClose).toHaveBeenCalledTimes(1)
    expect(base.onOpenProfile).toHaveBeenCalledWith('p1')
  })

  it('the Recognize button opens the composer preset for this member', () => {
    render(<MemberInfoModal viewRow={row} {...base} />)

    fireEvent.click(screen.getByRole('button', { name: /Recognize/ }))
    expect(base.onPraise).toHaveBeenCalledWith('p1')
    expect(base.onOpenProfile).not.toHaveBeenCalled()
  })
})

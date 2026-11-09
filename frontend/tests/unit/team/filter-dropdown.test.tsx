import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TeamFilterDropdown from '@/components/organisms/team-filter-dropdown'
import type { TeamFilter } from '@/components/organisms/team-filter-dropdown'

describe('TeamFilterDropdown', () => {
  it('reads the named team for a concrete filter', () => {
    render(<TeamFilterDropdown team="humana" onTeam={vi.fn()} />)
    expect(screen.getByText('Humana')).toBeTruthy()
  })

  it('falls back to All Teams naming when the filter id has no directory record', () => {
    render(<TeamFilterDropdown team={'nope-id' as unknown as TeamFilter} onTeam={vi.fn()} />)
    expect(screen.getByText('All Teams')).toBeTruthy()
  })

  it('opens, hands the picked id up and closes itself', () => {
    const onTeam = vi.fn()
    render(<TeamFilterDropdown team="all" onTeam={onTeam} />)

    fireEvent.click(screen.getByRole('button', { name: 'Select team' }))
    fireEvent.click(screen.getByText('PACCA AI'))
    expect(onTeam).toHaveBeenCalledWith('dev')
    // the row button list is gone — dropdown closed
    expect(screen.queryByRole('button', { name: /PACCA AI/ })).toBeNull()
  })
})

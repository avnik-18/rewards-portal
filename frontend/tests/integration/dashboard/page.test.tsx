import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from '@/page'

describe('DashboardPage (client page)', () => {
  it('assembles the dashboard from the mock data layer', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    // the hero greets the signed-in person; everything below mounts in the
    // same commit once the page-data hooks resolve
    expect(await screen.findByText(/Hello/)).toBeTruthy()
    expect(screen.getByText('My activity')).toBeTruthy()
    expect(screen.getByText('Team highlights')).toBeTruthy()
    // leaderboard shows the signer-in as You among the ranked rows
    expect(screen.getByText('You')).toBeTruthy()
  })
})

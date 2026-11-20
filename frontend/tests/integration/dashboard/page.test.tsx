import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from '@/page'

describe('DashboardPage (client page)', () => {
  it('assembles the dashboard from the data layer (mock + api-fed tiles)', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    // the hero greeting opens the page; the rail mounts in the same render
    expect(await screen.findByRole('heading', { level: 1 })).toBeTruthy()

    // rail: the balance tile, upcoming events, leaderboard and awards card
    const balanceCard = screen.getByText('Total reward balance')
    expect(balanceCard).toBeTruthy()
    expect(screen.getByText('Upcoming events')).toBeTruthy()
    expect(screen.getByText('Team leaderboard')).toBeTruthy()
    expect(screen.getByText('Quarterly awards')).toBeTruthy()

    // feed renders the stubbed /feed posts with the Cheers-for-peers pill
    expect(screen.getAllByRole('article').length).toBeGreaterThan(0)
  })

  it('keeps the right rail self-contained (balance tile + awards card)', async () => {
    const { container } = render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { level: 1 })
    expect(screen.getByText('Total reward balance')).toBeTruthy()
    expect(container.textContent).toContain('Go to My Rewards')
    expect(container.textContent).toContain('Nominate someone')
    expect(container.textContent).toContain('7,500 pts')
  })
})

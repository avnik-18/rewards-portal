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

    // the greeting row leads the page; everything below mounts in the same
    // commit once the page-data hooks resolve
    expect(await screen.findByRole('heading', { level: 1, name: /Hello .*celebrate the progress\./i })).toBeTruthy()
    expect(screen.getByText('Recognize a teammate')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Recognize a teammate' })).toBeTruthy()

    // stat strip: balance impedance across the three cells
    const balanceCell = screen.getByText('Total points balance')
    expect(balanceCell).toBeTruthy()
    const feedTitle = screen.getByText('Team leaderboard')
    expect(feedTitle).toBeTruthy()
    expect(screen.getByText('Celebrations today')).toBeTruthy()
    expect(screen.getByText('Quarterly awards')).toBeTruthy()

    // leaderboard shows the signed-in person as You among the ranked rows
    expect(screen.getByText('You')).toBeTruthy()

    // feed renders the stubbed /feed posts with their action rows
    expect(screen.getAllByRole('button', { name: 'Like' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('tab', { name: 'All' }).length).toBeGreaterThan(0)
  })

  it('filters the feed side: tabs other than All show an empty state', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { level: 1 })
    screen.getByRole('tab', { name: 'Celebrations' }).click()
    expect(await screen.findByText('Nothing here yet')).toBeTruthy()
  })

  it('keeps the right rail self-contained (points card + awards card)', async () => {
    const { container } = render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { level: 1 })
    expect(screen.getByText('Total points balance')).toBeTruthy()
    expect(container.textContent).toContain('Go to My Rewards')
    expect(container.textContent).toContain('Nominate someone')
    expect(container.textContent).toContain('7,500 pts')
  })
})

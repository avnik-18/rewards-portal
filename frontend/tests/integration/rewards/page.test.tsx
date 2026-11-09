import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RewardsPage from '@/rewards/page'

describe('RewardsPage (client page)', () => {
  it('mounts the balance hero and the sections behind the mock data layer', async () => {
    render(
      <MemoryRouter>
        <RewardsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'My Rewards' })).toBeTruthy()
    expect(screen.getByText('Total reward balance')).toBeTruthy()
  })
})

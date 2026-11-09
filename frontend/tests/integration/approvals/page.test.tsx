import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ApprovalsPage from '@/approvals/page'

describe('ApprovalsPage (client page)', () => {
  it('opens the approvals board from the mock data layer', async () => {
    render(
      <MemoryRouter>
        <ApprovalsPage />
      </MemoryRouter>,
    )

    // the board auto-selects the first pending points request
    expect(await screen.findByText('Approve')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Next time' })).toBeTruthy()
  })
})

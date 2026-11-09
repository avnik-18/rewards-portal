import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ComposePage from '@/recognize/page'

describe('ComposePage (client page)', () => {
  it('opens the recognize form with people from the mock data layer', async () => {
    render(
      <MemoryRouter>
        <ComposePage />
      </MemoryRouter>,
    )

    expect(await screen.findByPlaceholderText('Whom do you want to recognise?')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Ownership' }).length).toBeGreaterThan(0)
  })
})

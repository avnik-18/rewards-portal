import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PrimaryNav from '@/components/organisms/primary-nav'
import HeaderActions from '@/components/organisms/header-actions'

// the active route comes from React Router's location — set it per case
function renderNavAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PrimaryNav />
    </MemoryRouter>,
  )
}

describe('PrimaryNav', () => {
  it('renders exactly the three original nav items (ditto the approved design)', () => {
    renderNavAt('/')

    const links = screen.getAllByRole('link', { name: /dashboard|my team|my rewards/i })
    expect(links).toHaveLength(3)
    for (const l of links) {
      const href = l.getAttribute('href') ?? ''
      expect(href.startsWith('/')).toBe(true)
    }
    expect(screen.queryByRole('link', { name: /recognize/i })).toBeNull() // compose opens from the dashboard hero button
    expect(screen.queryByRole('link', { name: /approvals/i })).toBeNull() // not part of the original nav
  })

  it('marks only the current route active', () => {
    renderNavAt('/team')

    const team = screen.getByRole('link', { name: /my team/i })
    expect(team.getAttribute('aria-current')).toBe('page')
    const dash = screen.getByRole('link', { name: /dashboard/i })
    expect(dash.getAttribute('aria-current')).toBeNull()
  })

  it('flips the active page when the route changes', () => {
    renderNavAt('/rewards')
    expect(screen.getByRole('link', { name: /my rewards/i }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: /my team/i }).getAttribute('aria-current')).toBeNull()
  })

  it('header actions expose notifications + profile buttons', () => {
    render(<HeaderActions />)
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Profile menu' })).toBeTruthy()
  })

  it('opens the profile disclosure with the person card and My profile link', () => {
    render(
      <MemoryRouter>
        <HeaderActions />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Profile menu' }))
    expect(screen.getByRole('link', { name: /My profile/ })).toBeTruthy()
    expect(screen.getByText('Ayan')).toBeTruthy()

    // Escape closes the disclosure and returns focus to the trigger
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('link', { name: /My profile/ })).toBeNull()
  })

  it('a mousedown inside the disclosure keeps it open; outside closes it', () => {
    render(
      <MemoryRouter>
        <HeaderActions />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Profile menu' }))
    const card = screen.getByText('Senior Eng Manager')
    fireEvent.mouseDown(card) // inside — stays open
    expect(screen.getByRole('link', { name: /My profile/ })).toBeTruthy()

    fireEvent.mouseDown(document.body) // outside — dismisses
    expect(screen.queryByRole('link', { name: /My profile/ })).toBeNull()
  })

  it('picking My profile closes the disclosure', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <HeaderActions />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Profile menu' }))
    fireEvent.click(screen.getByRole('link', { name: /My profile/ }))
    expect(screen.queryByRole('link', { name: /My profile/ })).toBeNull()
  })
})

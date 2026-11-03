import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PrimaryNav from '@/components/organisms/primary-nav'
import HeaderActions from '@/components/organisms/header-actions'

// next/navigation's usePathname — mock per test case
const usePathnameMock = vi.fn()
vi.mock('next/navigation', () => ({ usePathname: () => usePathnameMock() }))

describe('PrimaryNav', () => {
  it('renders exactly the three original nav items (ditto the approved design)', () => {
    usePathnameMock.mockReturnValue('/')
    render(<PrimaryNav />)

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
    usePathnameMock.mockReturnValue('/team')
    render(<PrimaryNav />)

    const team = screen.getByRole('link', { name: /my team/i })
    expect(team.getAttribute('aria-current')).toBe('page')
    const dash = screen.getByRole('link', { name: /dashboard/i })
    expect(dash.getAttribute('aria-current')).toBeNull()
  })

  it('flips the active page when the route changes', () => {
    usePathnameMock.mockReturnValue('/rewards')
    render(<PrimaryNav />)
    expect(screen.getByRole('link', { name: /my rewards/i }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: /my team/i }).getAttribute('aria-current')).toBeNull()
  })

  it('header actions expose notifications + profile buttons', () => {
    render(<HeaderActions />)
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Profile menu' })).toBeTruthy()
  })
})

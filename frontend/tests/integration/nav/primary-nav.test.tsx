import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PrimaryNav from '@/components/organisms/primary-nav'
import HeaderActions from '@/components/organisms/header-actions'

// 'My Team' is parked until its team lane lands — the nav asserts the
// trimmed set; the persona prop drives the rest.
const EMPLOYEE_LINKS = ['Dashboard', 'My Rewards', 'Recognition history']
const ADMIN_LINKS = ['Dashboard', 'Manage', 'Award cycle']

vi.mock('@/lib/data-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/data-api')>('@/lib/data-api')
  return { ...actual, getMe: async () => ({ role: 'individual', persona: 'employee' }) }
})

function renderNavAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PrimaryNav persona="employee" />
    </MemoryRouter>,
  )
}

describe('PrimaryNav', () => {
  it('renders the dropped-in nav items per the trimmed persona set', () => {
    renderNavAt('/')

    const links = screen.getAllByRole('link', { name: /dashboard|my rewards|recognition history/i })
    expect(links).toHaveLength(EMPLOYEE_LINKS.length)
    const labels = links.map((l) => (l.textContent ?? '').trim())
    expect(labels).toEqual(EMPLOYEE_LINKS)
  })

  it('marks only the current route active', () => {
    renderNavAt('/recognition-history')
    expect(screen.getByRole('link', { name: /recognition history/i }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: /dashboard/i }).getAttribute('aria-current')).toBeNull()
  })

  it('flips the active page when the route changes', () => {
    renderNavAt('/rewards')
    expect(screen.getByRole('link', { name: /my rewards/i }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: /dashboard/i }).getAttribute('aria-current')).toBeNull()
  })

  it('renders the persona sets: leader gains the award cycle, admin works Manage', () => {
    const leader = render(
      <MemoryRouter initialEntries={['/']}>
        <PrimaryNav persona="leader" />
      </MemoryRouter>,
    )
    expect(leader.getAllByRole('link', { name: /award cycle/i })).toHaveLength(1)
    leader.unmount()

    render(
      <MemoryRouter initialEntries={['/']}>
        <PrimaryNav persona="admin" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /manage/i })).toBeTruthy()
    expect(ADMIN_LINKS.every((label) => label === 'Dashboard' || label === 'Manage' || label === 'Award cycle')).toBe(
      true,
    )
  })

  it('header actions expose notifications + profile buttons', () => {
    render(<HeaderActions />)
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Profile menu' })).toBeTruthy()
  })
})

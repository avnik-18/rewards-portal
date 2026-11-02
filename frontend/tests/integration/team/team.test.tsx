import { describe, it, expect, vi } from 'vitest'
import type { ReactElement } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { AppRouterContext as AppRouterContextProvider } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import TeamPage from '@/app/team/page'

const mockRouter = {
  back: vi.fn(),
  forward: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
}

// TeamScreen's profile/praise navigation uses useRouter; mock a mounted app router for jsdom.
function renderWithRouter(ui: ReactElement) {
  return render(<AppRouterContextProvider.Provider value={mockRouter as never}>{ui}</AppRouterContextProvider.Provider>)
}

async function renderTeamPage() {
  const Page = await TeamPage()
  renderWithRouter(Page as never)
}

describe('TeamPage — ditto of the old team screen', () => {
  it('shows both tab chips with the approvals badge and the Team header row', async () => {
    await renderTeamPage()

    expect(screen.getByRole('button', { name: /My team info/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /My Approvals/i })).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy() // unread approvals badge
    expect(screen.getByRole('heading', { name: /^Team$/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Select team/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Recognition Tree/i })).toBeTruthy()
    expect(screen.getByText('134')).toBeTruthy() // recognitions · this quarter stat
  })

  it('defaults to the Humana roster with S.no, values and per-row actions', async () => {
    await renderTeamPage()

    // Humana is the initial filter — dev (PACCA AI) members are not listed
    expect(screen.getByText('Aarav Sharma')).toBeTruthy()
    expect(screen.getByText('Priya Menon')).toBeTruthy()
    expect(screen.queryByText('Ishaan Verma')).toBeNull()

    expect(screen.getByText('S.no')).toBeTruthy()
    const praise = screen.getAllByRole('button', { name: /Praise/ })
    const viewInfo = screen.getAllByRole('button', { name: /View info/ })
    expect(praise).toHaveLength(8)
    expect(viewInfo).toHaveLength(8)
  })

  it('the team dropdown filters to All Teams and PACCA AI', async () => {
    await renderTeamPage()

    fireEvent.click(screen.getByRole('button', { name: /Select team/i }))
    // accessible names carry the letter-square glyph ("AAll Teams") — match by substring
    fireEvent.click(screen.getByRole('button', { name: /all teams/i }))
    expect(screen.getByText('Ishaan Verma')).toBeTruthy()
    // 13 members across both teams
    const praise = screen.getAllByRole('button', { name: /Praise/ })
    expect(praise).toHaveLength(13)
  })

  it('switches to the approvals inbox tab and back', async () => {
    await renderTeamPage()

    fireEvent.click(screen.getByRole('button', { name: /My Approvals/i }))
    expect(await screen.findByRole('heading', { name: /Approvals inbox/i })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /My team info/i }))
    expect(screen.getByRole('heading', { name: /^Team$/ })).toBeTruthy()
  })

  it('View info opens the member info modal with this-quarter stats', async () => {
    await renderTeamPage()

    fireEvent.click(screen.getAllByRole('button', { name: /View info/ })[0])
    const dlg = screen.getByRole('dialog', { name: 'Team member info' })
    expect(dlg).toBeTruthy()
    expect(dlg.textContent).toContain('Aarav Sharma')
    expect(dlg.textContent).toContain('Recognitions received')
    expect(dlg.textContent).toContain('Bengaluru')
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  })
})

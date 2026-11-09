import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TeamPage from '@/team/page'
import TeamPeopleTable from '@/components/organisms/team-people-table'
import type { TeamRow } from '@/lib/data-api'

// TeamScreen renders in one commit once the mock data hook resolves, so
// waiting for the first chip means the whole screen is steady for getBy calls.
async function renderTeamPage() {
  const view = render(
    <MemoryRouter>
      <TeamPage />
    </MemoryRouter>,
  )
  await screen.findByRole('button', { name: /My team info/i })
  return view
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

  it('opens the recognition tree overlay and closes it again', async () => {
    await renderTeamPage()

    fireEvent.click(screen.getByRole('button', { name: /Recognition Tree/i }))
    const tree = await screen.findByRole('dialog', { name: 'Recognition tree' })
    expect(tree.textContent).toContain('· you')

    fireEvent.click(screen.getByRole('button', { name: 'Close Recognition Tree' }))
    expect(screen.queryByRole('dialog', { name: 'Recognition tree' })).toBeNull()
  })

  it('the tree team filter dropdown closes on outside click and applies a pick', async () => {
    await renderTeamPage()

    fireEvent.click(screen.getByRole('button', { name: /Recognition Tree/i }))
    await screen.findByRole('dialog', { name: 'Recognition tree' })

    fireEvent.click(screen.getByRole('button', { name: 'Filter by team' }))
    expect(screen.getByRole('button', { name: 'Filter by team' }).getAttribute('aria-expanded')).toBe('true')

    // pick PACCA AI — the dropdown closes and the active label swaps
    fireEvent.click(screen.getByRole('button', { name: /PACCA AI/ }))
    expect(screen.queryByRole('button', { name: /All Teams/ })).toBeNull()

    // reopen and dismiss by mousedown outside the dropdown (the listener is mousedown)
    fireEvent.click(screen.getByRole('button', { name: 'Filter by team' }))
    fireEvent.mouseDown(document.body)
    expect(screen.getByRole('button', { name: 'Filter by team' }).getAttribute('aria-expanded')).toBe('false')
  })

  it('the horizontal header scrolls in lockstep with the table body', async () => {
    const { container } = await renderTeamPage()
    await screen.findByText('Designation')

    const bodyEl = container.querySelector<HTMLDivElement>('.rail-scroll.rounded-b-2xl')
    expect(bodyEl).toBeTruthy()
    if (!bodyEl) return
    bodyEl.scrollLeft = 120
    fireEvent.scroll(bodyEl)

    // the sticky head element mirrors whatever offset the body carries in jsdom
    const headEl = container.querySelector<HTMLDivElement>('.sticky.top-16')
    expect(headEl).toBeTruthy()
    if (!headEl) return
    expect(headEl.scrollLeft).toBe(bodyEl.scrollLeft)
  })
})

describe('TeamPeopleTable — directory record missing', () => {
  it('renders an unknown row id as "Unknown teammate", never the raw id', () => {
    const rowBehindGhostId: TeamRow = {
      id: 'ghost-1',
      given: 0,
      received: 0,
      lastRecognized: '— 30 days',
      valuesTop: 'ownership',
      team: 'humana',
    }

    render(
      <TeamPeopleTable
        visible={[rowBehindGhostId]}
        team="all"
        headRef={{ current: null }}
        bodyRef={{ current: null }}
        onBodyScroll={() => {}}
        onOpenProfile={() => {}}
        onPraise={() => {}}
        onOpenInfo={() => {}}
      />,
    )

    expect(screen.getByText('Unknown teammate')).toBeTruthy()
    expect(screen.queryByText('ghost-1')).toBeNull()
  })
})

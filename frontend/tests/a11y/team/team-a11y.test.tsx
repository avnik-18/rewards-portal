import { describe, it, expect, vi } from 'vitest'
import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import axe from 'axe-core'
import TeamPage from '@/team/page'

function renderWithRouter(ui: ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

async function scan(element: HTMLElement) {
  const { violations } = (await axe.run(element)) as { violations: unknown[] }
  return violations
}

vi.setConfig({ testTimeout: 15_000 })

describe('accessibility (axe-core) — team page', () => {
  it('team table tab has no a11y violations', async () => {
    const { container } = renderWithRouter(<TeamPage />)
    // the screen mounts in one commit once the mock data hook resolves
    await screen.findByRole('button', { name: /My team info/i })
    expect(await scan(container)).toHaveLength(0)
  })
})

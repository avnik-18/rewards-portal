import { describe, it, expect, vi } from 'vitest'
import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import axe from 'axe-core'
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

function renderWithRouter(ui: ReactElement) {
  return render(<AppRouterContextProvider.Provider value={mockRouter as never}>{ui}</AppRouterContextProvider.Provider>)
}

async function scan(element: HTMLElement) {
  const { violations } = (await axe.run(element)) as { violations: unknown[] }
  return violations
}

vi.setConfig({ testTimeout: 15_000 })

describe('accessibility (axe-core) — team page', () => {
  it('team table tab has no a11y violations', async () => {
    const pageElement = await TeamPage()
    const { container } = renderWithRouter(pageElement as never)
    expect(await scan(container)).toHaveLength(0)
  })
})

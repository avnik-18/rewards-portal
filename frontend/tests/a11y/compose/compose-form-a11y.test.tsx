import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import axe from 'axe-core'
import { AppRouterContext as AppRouterContextProvider } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { ComposeForm } from '@/app/recognize/compose-form'
import { PEOPLE } from '@/lib/mock-data'

const people = Object.values(PEOPLE).filter((p) => p.id !== 'me')

const mockRouter = { back: vi.fn(), push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }

async function scan(element: HTMLElement) {
  const results = await axe.run(element)
  return results.violations
}

describe('accessibility (axe-core) — compose', () => {
  it('the compose form has no automatic a11y violations', async () => {
    // ComposeForm's Back button uses useRouter; mock a mounted app router for jsdom
    const { container } = render(
      <AppRouterContextProvider.Provider value={mockRouter as never}>
        <ComposeForm people={people} />
      </AppRouterContextProvider.Provider>,
    )
    expect(await scan(container)).toHaveLength(0)
  })
})

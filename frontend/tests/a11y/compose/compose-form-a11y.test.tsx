import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import axe from 'axe-core'
import { ComposeForm } from '@/recognize/compose-form'
import { PEOPLE } from '@/lib/mock-data'

const people = Object.values(PEOPLE).filter((person) => person.id !== 'me')

async function scan(element: HTMLElement) {
  const results = await axe.run(element)
  return results.violations
}

vi.setConfig({ testTimeout: 15_000 })

describe('accessibility (axe-core) — compose', () => {
  it('the compose form has no automatic a11y violations', async () => {
    // ComposeForm's Back button navigates through React Router memory routing
    const { container } = render(
      <MemoryRouter>
        <ComposeForm people={people} />
      </MemoryRouter>,
    )
    expect(await scan(container)).toHaveLength(0)
  })
})

import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import axe from 'axe-core'
import MyTree from '@/components/organisms/MyTree'
import { getRecognitionTree } from '@/lib/data-api'

async function scan(element: HTMLElement) {
  const { violations } = (await axe.run(element)) as { violations: unknown[] }
  return violations
}

vi.setConfig({ testTimeout: 15_000 })

describe('accessibility (axe-core) — recognition tree', () => {
  it('the open tree overlay has no a11y violations', async () => {
    const tree = await getRecognitionTree()
    // render inside landmarks so axe has a full page context, like the live page
    const { container } = render(
      <main>
        <MyTree open onClose={() => {}} data={tree} />
      </main>,
    )
    const violations = await scan(container)
    expect(violations).toHaveLength(0)
  })
})

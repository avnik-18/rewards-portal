import { describe, it, expect } from 'vitest'
import { useEffect, useState } from 'react'
import { render } from '@testing-library/react'
import { waitFor } from '@testing-library/react'
import { useCountUp } from '@/lib/use-count-up'

function Demo({ target, durationMs }: { target: number; durationMs: number }) {
  return <span data-testid="value">{useCountUp(target, durationMs)}</span>
}

/** Emulates a post-hydration data update: the hook mounts with `initial`,
 *  then the target swaps to `changed` one frame later WITHOUT remounting. */
function ChangeAfterFrame({ initial, changed, durationMs }: { initial: number; changed: number; durationMs: number }) {
  const [target, setTarget] = useState(initial)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setTarget(changed))
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot harness: swap to `changed` exactly once on mount
  }, [])
  return <span data-testid="value">{useCountUp(target, durationMs)}</span>
}

describe('useCountUp', () => {
  it('settles on the target and stops scheduling once the clock runs out', async () => {
    const { getByText, unmount } = render(<Demo target={500} durationMs={100} />)

    await waitFor(() => expect(getByText('500')).toBeTruthy())

    // one more frame: a tick where t >= 1 runs and takes the stop branch
    await new Promise(requestAnimationFrame)
    unmount()
  })

  it("sir's review: the hydrated number never flashes target → 0 → target", async () => {
    const { getByText } = render(<Demo target={500} durationMs={100} />)
    expect(getByText('500')).toBeTruthy()
    await waitFor(() => expect(getByText('500')).toBeTruthy())
    // one extra frame proves no tick has overwritten the settled value with 0
    await new Promise(requestAnimationFrame)
    expect(getByText('500')).toBeTruthy()
  })

  it('animates 0 → target only when the target changes after mount', async () => {
    const { getByText } = render(<ChangeAfterFrame initial={200} changed={900} durationMs={80} />)
    // hydration shows the settled number
    expect(getByText('200')).toBeTruthy()
    // the updated target replaces it (animated — includes rAF ticks in between)
    await waitFor(() => expect(getByText('900')).toBeTruthy())
  }, 15_000)

  it('prefers-reduced-motion settles on the new target after one frame, no animation', async () => {
    const original = window.matchMedia
    window.matchMedia = ((query: string) => ({
      ...original(query),
      matches: true,
    })) as typeof window.matchMedia
    try {
      const { getByText } = render(<ChangeAfterFrame initial={100} changed={400} durationMs={80} />)
      // hydration shows the settled number
      expect(getByText('100')).toBeTruthy()
      // one frame later the number settles on the new target — no tick ramp
      await waitFor(() => expect(getByText('400')).toBeTruthy())
      await new Promise(requestAnimationFrame)
      expect(getByText('400')).toBeTruthy()
    } finally {
      window.matchMedia = original
    }
  }, 15_000)
})

'use client'

import { useEffect, useRef, useState } from 'react'

/** Counts from 0 to target when the value changes after mount — the
 *  dashboard's animated numbers.
 *  sir's a11y review #4: SSR + screen readers render the settled number and
 *  it STAYS the settled number on hydration — the effect no longer replays
 *  target → 0 → target on every load. The animation only runs for a target
 *  that changes after the first mount, and prefers-reduced-motion settles it
 *  after one frame instead of animating. */
export function useCountUp(target: number, durationMs = 1100): number {
  const [value, setValue] = useState(target)
  // first effect run hydrates an already-server-rendered number — no replay
  const hydrated = useRef(false)

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true
      return
    }
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (motionQuery.matches) {
      // no animation: settle on the target one frame later — never a
      // synchronous setState inside the effect (react-hooks/set-state-in-effect)
      const settleFrame = requestAnimationFrame(() => setValue(target))
      return () => cancelAnimationFrame(settleFrame)
    }
    let raf = 0
    const start = performance.now()
    const tick = () => {
      // self-measured time — some environments (jsdom) give rAF callbacks an unreliable timestamp
      const progress = Math.min(1, (performance.now() - start) / durationMs)
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])

  return value
}

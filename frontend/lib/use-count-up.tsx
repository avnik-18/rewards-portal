'use client'

import { useEffect, useState } from 'react'

/** Counts from 0 to target on mount — the dashboard's animated numbers.
 *  sir (a11y): prefers-reduced-motion skips the animation entirely, and the
 *  initial (SSR + first hydration) value starts AT the target so server HTML
 *  and screen readers see the real number first — only then does the
 *  animation replay from 0 to the target. */
export function useCountUp(target: number, durationMs = 1100): number {
  // SSR renders the settled number; the animation only re-rolls inside the
  // client effect below.
  const [value, setValue] = useState(target)

  useEffect(() => {
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

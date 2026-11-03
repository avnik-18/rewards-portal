'use client'

import { useEffect, useState } from 'react'

/** Counts from 0 to target on mount — the dashboard's animated numbers.
 *  sir (a11y): prefers-reduced-motion skips the animation entirely, and the
 *  hydrated value starts AT the target so SSR content and screen readers see
 *  the real number first (no 0-flash). */
export function useCountUp(target: number, durationMs = 1100): number {
  const [value, setValue] = useState(0)

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (motionQuery.matches) {
      setValue(target)
      return
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

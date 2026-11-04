import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll } from 'vitest'

// jsdom ships no window.matchMedia, yet the components under test consult it
// for prefers-reduced-motion (Hero, compose heading, count-up animation).
// Report a non-matching query — tests run in "motion allowed" mode — with the
// listener API mocked so the components subscribe and clean up safely.
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {}, // deprecated Safari API, kept for the two components that still call it
      removeListener: () => {}, // deprecated Safari API, kept for the two components that still call it
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
})

afterEach(() => {
  cleanup()
})

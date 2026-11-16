import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll } from 'vitest'
import { ORG_STATS } from '@/lib/mock-data'

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

// CI runs with NO backend: one global fetch stub makes the api-backed
// facades deterministic everywhere (count = the delivery mock the suites
// already assert on, hero = nothing published → the UI's static fallback),
// and any UNEXPECTED network call fails loudly instead of leaking.
beforeAll(() => {
  const base = 'http://rewards.test/api/v1'
  ;(import.meta.env as { VITE_API_BASE_URL?: string }).VITE_API_BASE_URL = base
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input).replace(base, '')
    if (path === '/recognitions/count') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ total: ORG_STATS.recognitions }),
      })
    }
    if (path === '/media/hero') {
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ detail: 'hero_not_published' }),
      })
    }
    return Promise.reject(new Error(`unexpected fetch in tests: ${String(input)} ${JSON.stringify(init)}`))
  }) as typeof window.fetch
})

afterEach(() => {
  cleanup()
})

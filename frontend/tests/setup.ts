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
// already assert on, hero = nothing published → the UI's static fallback,
// me = the seeded actor so the header greeting resolves), and any UNEXPECTED
// network call fails loudly instead of leaking.
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
    if (path === '/feed') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          persona: 'employee',
          items: [
            {
              recognition_id: 'fd1',
              tier: 'own',
              occurred_at: new Date().toISOString(),
              giver_id: 'u2',
              giver_name: 'Marco Silva',
              giver_avatar: null,
              kind: 'praise',
              message: 'Fixed the claims pipeline outage before standup.',
              points: 50,
              value_label: 'Ownership',
              recipients: [{ user_id: 'u1', name: 'Ayan', points: 50, kind: 'to' }],
            },
            {
              recognition_id: 'fd2',
              tier: 'team',
              occurred_at: new Date(Date.now() - 48 * 3_600_000).toISOString(),
              giver_id: 'u3',
              giver_name: 'Priya Rao',
              giver_avatar: null,
              kind: 'welcome',
              message: 'Welcomed the new pod to the platform team.',
              points: 0,
              value_label: null,
              recipients: [
                { user_id: 'u4', name: 'Deepa Menon', points: 0, kind: 'to' },
                { user_id: 'u5', name: 'Brooke Davis', points: 0, kind: 'cc' },
              ],
            },
          ],
          next_cursor: null,
        }),
      })
    }
    if (path === '/me') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          employee_code: 'E-PR',
          full_name: 'Ayan',
          email: 'priya@emids.test',
          role: 'individual',
          title: 'Engineer',
          department: 'Engineering',
        }),
      })
    }
    if (path === '/auth/demo-users') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [
          { employee_code: 'E-009', full_name: 'Deepa Menon', title: 'Program Admin', department: 'People' },
          { employee_code: 'E-BR', full_name: 'Brooke Davis', title: 'Executive Assistant', department: 'Operations' },
          { employee_code: 'E-PR', full_name: 'Priya Rao', title: 'Engineer', department: 'Engineering' },
        ],
      })
    }
    return Promise.reject(new Error(`unexpected fetch in tests: ${String(input)} ${JSON.stringify(init)}`))
  }) as typeof window.fetch
})

// The App routes sit behind the sign-in gate — the shared test identity
// pre-picks the seeded actor so suites that render the portal pass through.
// (Suite-local overrides clear storage; restore happens in afterEach there.)
beforeAll(() => {
  window.localStorage.setItem('applause-demo-user', 'E-PR')
})

afterEach(() => {
  cleanup()
})

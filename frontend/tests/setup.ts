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
    if (path === '/me/stats') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          points_balance: 1240,
          allowance_left: null,
          allowance_allocated: null,
          recognitions_given: 3,
          recognitions_received: 4,
        }),
      })
    }
    if (path.startsWith('/leaderboard')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          entries: [
            { rank: 1, name: 'Daniel C.', points: 420, is_me: false },
            { rank: 2, name: 'Rahul Nair', points: 380, is_me: true },
            { rank: 3, name: 'Erica Stone', points: 275, is_me: false },
            { rank: 4, name: 'Hema Krish', points: 250, is_me: false },
            { rank: 5, name: 'Kiran Menon', points: 220, is_me: false },
            { rank: 3, name: 'Aarav S.', points: 275, is_me: false },
            { rank: 4, name: 'Priya M.', points: 250, is_me: false },
            { rank: 5, name: 'Kenji W.', points: 220, is_me: false },
          ],
        }),
      })
    }
    if (path === '/awards/showcase') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          days_to_nominations_close: 19,
          open_categories: 3,
          cycle_prize_total: 7500,
          my_jury: { cast: false, assigned: false },
        }),
      })
    }
    if (path.startsWith('/notifications/unread-count')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ unread_count: 3 }),
      })
    }
    if (path.startsWith('/notifications/read')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ marked_read: 3 }),
      })
    }
    if (path.startsWith('/notifications')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: 'n-1',
            type: 'praise',
            giver_name: 'Brooke Davis',
            points: 50,
            message: 'Great release support.',
            created_at: '2026-11-16T09:00:00Z',
          },
          {
            id: 'n-2',
            type: 'praise',
            giver_name: 'Arun Kamath',
            points: 25,
            message: null,
            created_at: '2026-11-15T14:00:00Z',
          },
          {
            id: 'n-3',
            type: 'milestone_5_year',
            giver_name: null,
            points: null,
            message: null,
            created_at: '2026-11-14T08:00:00Z',
          },
        ],
      })
    }
    if (path === '/media/hero') {
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ detail: 'hero_not_published' }),
      })
    }
    if (path === '/me') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          employee_code: 'E-PR',
          full_name: 'Priya Rao',
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

// Mock data — trimmed port of src/data.ts, dashboard datasets only.
// This is the ONLY file the dashboard talks to today; data-api.ts wraps it so
// Ayan's FastAPI slots in here later without touching components.
// Directory records live in people-records.ts (kept under the 200-line rule).

import { PEOPLE } from './people-records'
import type { Person } from './people-records'

export * from './people-records'

export const person = (id: string): Person => PEOPLE[id] ?? PEOPLE.me

export const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

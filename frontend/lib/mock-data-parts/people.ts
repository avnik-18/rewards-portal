// Mock data — trimmed port of src/data.ts, dashboard datasets only.
// This is the ONLY file the dashboard talks to today; data-api.ts wraps it so
// Ayan's FastAPI slots in here later without touching components.
// Directory records live in people-records.ts (kept under the 200-line rule).

import { PEOPLE } from './people-records'
import type { Person } from './people-records'

export * from './people-records'

/** Directory lookup. Returns undefined for unknown ids — callers must handle
 *  unknown ids instead of silently resolving to the signed-in user. */
export const person = (id: string): Person | undefined => PEOPLE[id]

/** Display fallback for safe call sites that only need a human label
 *  (avatar rows, share strips) — URL-supplied ids never render a real name. */
export const personDisplayName = (id: string): string => {
  const directoryPerson = PEOPLE[id]
  return directoryPerson ? directoryPerson.name : 'Unknown teammate'
}

export const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

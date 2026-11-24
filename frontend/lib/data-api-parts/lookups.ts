// Lookup helpers + value/team catalogues the UI reads. Started on the static
// demo data, then hydrated ONCE at app boot from GET /values — components keep
// importing the same names from the façade, so the live catalog swaps in with
// zero component edits (mock stays the outage fallback).
import {
  CORE_VALUES as STATIC_CORE_VALUES,
  VALUE_TEMPLATES as STATIC_TEMPLATES,
  type CoreValue,
  type PraiseTemplate,
} from '../mock-data-parts/values'
import { person as mockPerson, type Person } from '../mock-data-parts/people'
import { PEOPLE } from '../mock-data-parts/people-records'
import { TEAMS } from '../mock-data-parts/team'

export type { CoreValue, PraiseTemplate, ValueLived } from '../mock-data-parts/values'
export type { Person } from '../mock-data-parts/people-records'
export type { TeamId } from '../mock-data-parts/team'
export { TEAMS, PEOPLE }

/**
 * Value keys the composer can hold: mostly the five static demo ids, plus any
 * live-only value keys the backend adds. Live snake_case keys map onto the
 * matching static identity (loadValues), so both sources are the same key.
 */
export type ValueKey = 'customerFirst' | 'innovation' | 'collaboration' | 'ownership' | 'winningMindset'

const normKey = (key: string): string => key.toLowerCase().replace(/[^a-z0-9]/g, '')

/** normKey → the static demo key with that identity ('customer_first' maps to
 *  'customerFirst'). Live rows land on the static identity when one exists, so
 *  mock pages keep their camelCase contract and no picker shows duplicates. */
const STATIC_KEY_BY_NORM: Record<string, string> = Object.fromEntries(
  Object.keys(STATIC_CORE_VALUES).map((staticKey) => [normKey(staticKey), staticKey]),
)

export const CORE_VALUES = { ...STATIC_CORE_VALUES } as Record<ValueKey, CoreValue>
export const VALUE_TEMPLATES = Object.fromEntries(
  Object.entries(STATIC_TEMPLATES).map(([key, templates]) => [
    key,
    templates.map((template) => ({ ...template, urls: [...template.urls] })),
  ]),
) as Record<ValueKey, PraiseTemplate[]>
export const VALUE_KEYS = Object.keys(STATIC_CORE_VALUES) as ValueKey[]

/** Live value key → backend value UUID, for POST /recognitions (value_id). */
const liveValueIds: Record<string, string> = {}

/** Live directory rows (UUID ids) the static PEOPLE record book doesn't own. */
const livePeople = new Map<string, Person>()

/** Mock-first lookup that falls back to the live directory registry —
 *  avatar/name call sites keep working with UUID ids untouched. */
export const person = (id: string): Person | undefined => mockPerson(id) ?? livePeople.get(id)

export const personDisplayName = (id: string): string => person(id)?.name ?? 'Unknown teammate'

export const initials = (name: string): string =>
  name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

export const normValueKey = normKey
/** Register live directory rows (GET /people mapped to Person); manager rows
 *  named by the API become synthetic entries so auto-CC chips resolve. */
export function registerLivePeople(rows: Person[]): void {
  for (const row of rows) livePeople.set(row.id, row)
}

/** The catalog identity for a backend key: the matching static demo key when
 *  one exists (snake_case 'customer_first' → 'customerFirst'), else the
 *  normalised string itself. */
const catalogKeyFor = (backendKey: string): string =>
  STATIC_KEY_BY_NORM[normKey(backendKey)] ?? normKey(backendKey)

/** value_id the backend expects for a chosen value key, or null (omit).
 *  Accepts either casing — resolve through the same identity as loadValues. */
export const valueIdFor = (key: ValueKey): string | null =>
  liveValueIds[STATIC_KEY_BY_NORM[normKey(key)] ?? normKey(key)] ?? null

/** Remap a backend template art url to an asset this app can actually serve:
 *  the demo seed points art_json at cdn.emids.test — a demo TLD that never
 *  resolves in a browser. Letter-cased basename matches /xoxo/ webp files. */
export function resolveArtUrl(url: string): string {
  if (!/^https?:\/\//.test(url)) return url
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.endsWith('emids.test')) return url
    const base = parsed.pathname.split('/').pop() ?? ''
    const local = base.replace(/[.-]+/g, '_')
    return `/xoxo/${local}`
  } catch {
    return url
  }
}

interface LiveTemplateRow {
  id: string
  name: string
  emoji: string | null
  art_urls?: string[]
  prefill?: string | null
}

interface LiveValueRow {
  id: string
  key: string
  label: string
  templates: LiveTemplateRow[]
}

const NEUTRAL_VALUE: CoreValue = { label: '', ink: 'text-ink', soft: 'bg-slate-100', solid: '#2563eb' }

/** Hydrate values/templates from the live catalog. Known backend keys land on
 *  the static demo identity (same palette, no duplicate buttons); the static
 *  templates stay as art fallback whenever a live value lists none. */
export function loadValues(rows: LiveValueRow[]): void {
  const coreMap = CORE_VALUES as Record<string, CoreValue>
  const templateMap = VALUE_TEMPLATES as Record<string, PraiseTemplate[]>
  const valueKeys = VALUE_KEYS as unknown as string[]
  for (const row of rows) {
    const key = catalogKeyFor(row.key)
    const palette = coreMap[key]
    const staticTemplates = templateMap[key] ?? []
    const mapped: PraiseTemplate[] = row.templates.map((template, index) => ({
      id: template.id,
      name: template.name,
      emoji: template.emoji ?? staticTemplates[0]?.emoji ?? '⭐',
      urls:
        template.art_urls && template.art_urls.length > 0
          ? template.art_urls.map(resolveArtUrl)
          : (staticTemplates[index]?.urls ?? staticTemplates[0]?.urls ?? []),
      prefill: template.prefill ?? staticTemplates[0]?.prefill ?? '',
    }))
    if (palette) {
      if (row.label) palette.label = row.label
    } else {
      coreMap[key] = { ...NEUTRAL_VALUE, label: row.label || row.key }
    }
    templateMap[key] = mapped
    liveValueIds[key] = row.id
    if (!valueKeys.includes(key)) valueKeys.push(key)
  }
}

let hydration: Promise<void> | null = null

/** One cached GET /values hydration. Never rejects: when the backend is down
 *  the static demo catalog stays in use (loudly logged for the outage). */
export function ensureLookupsLive(): Promise<void> {
  if (hydration) return hydration
  hydration = import('../api-client')
    .then(({ apiFetch }) => apiFetch<LiveValueRow[]>('/values'))
    .then((rows) => {
      if (Array.isArray(rows)) loadValues(rows)
    })
    .catch((error) => {
      console.error('[lookups] live values catalog unavailable — demo templates in use:', error)
      hydration = null
    })
  return hydration
}

/** For tests — drop live additions, back to the pure static demo catalog. */
export function resetLookupsStatic(): void {
  for (const key of Object.keys(liveValueIds)) delete liveValueIds[key]
  const staticKeys = new Set(Object.keys(STATIC_CORE_VALUES))
  for (let i = VALUE_KEYS.length - 1; i >= 0; i -= 1) if (!staticKeys.has(VALUE_KEYS[i])) VALUE_KEYS.splice(i, 1)
}

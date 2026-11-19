/**
 * The one fetch doorway to the FastAPI backend. `VITE_API_BASE_URL` carries
 * the FULL mount point (scheme + host + `/api/v1`) — see .env.example.
 *
 * Plain header objects, not the `Headers`/`Response` globals: jsdom ships no
 * fetch stack, so the unit suite runs against bare objects too.
 */
import { activeDemoUser } from './demo-auth'

function resolveBase(): string {
  const base = import.meta.env.VITE_API_BASE_URL
  if (!base) throw new Error('VITE_API_BASE_URL is required (see .env.example)')
  // copy-paste drift (`http://host:8000/api/v1/`) must not yield `//route`
  return base.replace(/\/+$/, '')
}

/** Dev-mode identity header. In local dev the backend resolves the actor
 *  from X-Demo-User: <employee_code>. Production speaks Bearer — when
 *  Entra SSO lands, replace this function and nothing else. The value is
 *  read at CALL time: the login screen's picked user (localStorage via
 *  lib/demo-auth) over the build-time env fallback; with neither there is
 *  NO header at all (no invented identity). */
function decorateIdentity(headers: Record<string, string>): void {
  if (import.meta.env.DEV) {
    const user = activeDemoUser()
    if (user) headers['X-Demo-User'] = user
  }
}

export class ApiError extends Error {
  readonly status: number
  /** Stable backend domain code (e.g. 'double_refund_blocked'), present only
   *  when the {detail} envelope is a single snake_case token — route messages
   *  (prose) never carry one, so callers can filter on it safely. */
  readonly code?: string

  constructor(status: number, detail: string, code?: string) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

const DETAIL_IS_CODE = /^[a-z][a-z0-9_]*$/

async function parseError(response: Response): Promise<ApiError> {
  let detail = response.statusText || `request failed with status ${response.status}`
  try {
    const body: unknown = await response.json()
    if (body && typeof body === 'object' && 'detail' in body) {
      detail = String((body as { detail: unknown }).detail)
    }
  } catch {
    // non-JSON body (proxy/gateway) — statusText stands in
  }
  return new ApiError(response.status, detail, DETAIL_IS_CODE.test(detail) ? detail : undefined)
}

/** crypto.randomUUID is secure-context-only — a demo served from
 *  http://192.168.x.x or any LAN origin has NO randomUUID and every POST
 *  would crash on the idempotency key. web crypto's getRandomValues is
 *  available everywhere the fetch stack is; build the RFC-4122 shape from it. */
function newIdempotencyKey(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // RFC variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** GET the JSON at the route — the façade's door for read calls. */
export async function apiFetch<T>(path: string): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  decorateIdentity(headers)
  const response = await fetch(`${resolveBase()}${path}`, { headers })
  if (!response.ok) throw await parseError(response)
  return (await response.json()) as T
}

/** POST the body JSON — Idempotency-Key default keeps retried sends safe. */
export async function apiPost<T>(route: string, body: unknown, idempotencyKey?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Idempotency-Key': idempotencyKey ?? newIdempotencyKey(),
  }
  decorateIdentity(headers)
  const response = await fetch(`${resolveBase()}${route}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!response.ok) throw await parseError(response)
  return (await response.json()) as T
}

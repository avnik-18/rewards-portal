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
  return base
}

/** Dev-mode identity header. In local dev the backend resolves the actor
 *  from X-Demo-User: <employee_code>. Production speaks Bearer — when
 *  Entra SSO lands, replace this function and nothing else. The value is
 *  read at CALL time: the login screen's picked user (localStorage via
 *  lib/demo-auth) over the build-time env fallback. */
function decorateIdentity(headers: Record<string, string>): void {
  if (import.meta.env.DEV) {
    headers['X-Demo-User'] = activeDemoUser()
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
    'Idempotency-Key': idempotencyKey ?? crypto.randomUUID(),
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

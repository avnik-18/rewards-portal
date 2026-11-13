// The single network boundary for lib/data-api-parts/* — a façade function
// passes a route like '/me' and gets typed JSON back. Errors surface as one
// ApiError carrying the backend's {detail} envelope (fn_* domain codes or
// route messages), never a raw Response.
// Pure-Vite env vars via import.meta.env: VITE_API_BASE_URL + VITE_DEMO_USER.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
const API_PREFIX = '/api/v1'

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

/** Identity headers: local demo impersonation today; the Entra Bearer token
 *  attaches at the same seam when real auth reaches the frontend. */
function authHeaders(): Record<string, string> {
  const demoUser = import.meta.env.VITE_DEMO_USER
  return demoUser ? { 'X-Demo-User': demoUser } : {}
}

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

export async function apiGet<T>(route: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${API_PREFIX}${route}`, {
    headers: { Accept: 'application/json', ...authHeaders() },
  })
  if (!response.ok) throw await parseError(response)
  return response.json() as Promise<T>
}

export async function apiPost<T>(route: string, body: unknown, idempotencyKey?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${API_PREFIX}${route}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey ?? crypto.randomUUID(),
      ...authHeaders(),
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw await parseError(response)
  return response.json() as Promise<T>
}

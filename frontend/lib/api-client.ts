/**
 * The one fetch doorway to the FastAPI backend. `VITE_API_BASE_URL` carries
 * the FULL mount point (scheme + host + `/api/v1`) — see .env.example.
 *
 * Plain header objects, not the `Headers`/`Response` globals: jsdom ships no
 * fetch stack, so the unit suite runs against bare objects too.
 */

function resolveBase(): string {
  const base = import.meta.env.VITE_API_BASE_URL
  if (!base) throw new Error('VITE_API_BASE_URL is required (see .env.example)')
  return base
}

/** Dev-mode identity header. In local dev the backend resolves the actor
 *  from X-Demo-User: <employee_code>. Production speaks Bearer — when
 *  Entra SSO lands, replace this function and nothing else. */
function decorateIdentity(headers: Record<string, string>): void {
  if (import.meta.env.DEV) {
    headers['X-Demo-User'] = import.meta.env.VITE_DEMO_USER || 'E-PR'
  }
}

export async function apiFetch<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {}
  decorateIdentity(headers)
  const response = await fetch(`${resolveBase()}${path}`, { headers })
  if (!response.ok) throw new Error(`API ${path} failed: HTTP ${response.status}`)
  return (await response.json()) as T
}

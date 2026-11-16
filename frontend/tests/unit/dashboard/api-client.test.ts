import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiError, apiFetch } from '@/lib/api-client'
import { getDemoUsers } from '@/lib/data-api'
import { getHeroMedia } from '@/lib/data-api'

const fetchMock = vi.fn()

// The envs the api-client reads live on the runtime import.meta.env object —
// mutate it directly (vi.stubEnv does not reach vite's inlined env object)
// and restore the originals so neighbouring suites are unaffected.
const envBag = import.meta.env as Record<string, string | undefined>
const ORIGINAL_BASE = envBag.VITE_API_BASE_URL
const ORIGINAL_USER = envBag.VITE_DEMO_USER

beforeEach(() => {
  envBag.VITE_API_BASE_URL = 'http://rewards.test/api/v1'
  envBag.VITE_DEMO_USER = 'E-PR' // the env identity (no invented default anymore)
  window.localStorage.clear() // pristine: no picked demo identity from setup
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  envBag.VITE_API_BASE_URL = ORIGINAL_BASE
  envBag.VITE_DEMO_USER = ORIGINAL_USER
  vi.unstubAllGlobals()
})

describe('apiFetch', () => {
  it('prefixes the base URL, parses json and carries the dev identity header', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ total: 7 }) })
    await expect(apiFetch<{ total: number }>('/recognitions/count')).resolves.toEqual({ total: 7 })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://rewards.test/api/v1/recognitions/count')
    expect(init.headers['X-Demo-User']).toBe('E-PR')
  })

  it('exposes the configured demo user from the env', async () => {
    envBag.VITE_DEMO_USER = 'E-BR'
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    await apiFetch('/me')
    expect(fetchMock.mock.calls[0][1].headers['X-Demo-User']).toBe('E-BR')
  })

  it('fails fast before a request when the base url env is absent', async () => {
    envBag.VITE_API_BASE_URL = ''
    await expect(apiFetch('/media/hero')).rejects.toThrow('VITE_API_BASE_URL is required')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('raises ApiError on any non-2xx — the snake_case {detail} becomes the stable code', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      json: async () => ({ detail: 'double_refund_blocked' }),
    })
    const err = (await apiFetch('/media/hero').catch((e: unknown) => e)) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(500)
    expect(err.code).toBe('double_refund_blocked')
    expect(err.message).toContain('double_refund_blocked')
  })

  it('prose detail stays code-free; a non-JSON proxy body falls back to statusText', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      json: async () => ({ detail: 'actor does not own this recognition' }),
    })
    const prose = (await apiFetch('/me').catch((e: unknown) => e)) as ApiError
    expect(prose.code).toBeUndefined()
    expect(prose.message).toBe('actor does not own this recognition')

    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: async () => {
        throw new Error('not json')
      },
    })
    const proxy = (await apiFetch('/me').catch((e: unknown) => e)) as ApiError
    expect(proxy.message).toBe('Bad Gateway')
  })
})

describe('getDemoUsers (login directory)', () => {
  it('returns the parsed directory rows verbatim', async () => {
    const row = { employee_code: 'E-PR', full_name: 'Priya Rao', title: 'Engineer', department: 'Engineering' }
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => [row] })
    await expect(getDemoUsers()).resolves.toEqual([row])
  })

  it('propagates backend refusal — the login screen needs the error for its Retry state', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found', json: async () => ({}) })
    const err = (await getDemoUsers().catch((e: unknown) => e)) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(404)
  })
})

describe('getHeroMedia degradation', () => {
  it('resolves null on 404 — nothing published in the registry', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ detail: 'hero_not_published' }),
    })
    await expect(getHeroMedia()).resolves.toBeNull()
  })

  it('resolves null on a backend outage instead of blanking the page', async () => {
    fetchMock.mockRejectedValue(new Error('connection refused'))
    await expect(getHeroMedia()).resolves.toBeNull()
  })
})

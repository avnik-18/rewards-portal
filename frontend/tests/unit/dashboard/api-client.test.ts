import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiFetch } from '@/lib/api-client'
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
  delete envBag.VITE_DEMO_USER
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

  it('raises a small error on any non-2xx', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    await expect(apiFetch('/media/hero')).rejects.toThrow('HTTP 500')
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

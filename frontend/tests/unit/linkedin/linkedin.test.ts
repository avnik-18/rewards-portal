import { afterAll, describe, expect, it } from 'vitest'
import { linkedinShareUrl, recognitionPageUrl, recognitionBase } from '@/lib/linkedin'

const REAL_BASE = process.env.NEXT_PUBLIC_RECOGNITION_BASE_URL

afterAll(() => {
  process.env.NEXT_PUBLIC_RECOGNITION_BASE_URL = REAL_BASE
})

describe('recognitionPageUrl', () => {
  it('joins the configured base with the recognition path', () => {
    expect(recognitionPageUrl('rc1')).toBe('https://recognition.company.com/recognition/rc1')
  })

  it('encodes the id in the path', () => {
    expect(recognitionPageUrl('rc 1')).toBe('https://recognition.company.com/recognition/rc%201')
  })

  it('follows the environment override', () => {
    process.env.NEXT_PUBLIC_RECOGNITION_BASE_URL = 'https://pilot.company.com'
    expect(recognitionPageUrl('rc1')).toBe('https://pilot.company.com/recognition/rc1')
  })
})

describe('linkedinShareUrl', () => {
  it('builds the share-offsite hand-off with the encoded page URL', () => {
    const page = recognitionPageUrl('rc1')
    const share = new URL(linkedinShareUrl(page))
    expect(share.hostname).toBe('www.linkedin.com')
    expect(share.pathname).toBe('/sharing/share-offsite/')
    expect(share.searchParams.get('url')).toBe(page)
  })

  it('rejects a missing URL', () => {
    expect(() => linkedinShareUrl(undefined)).toThrow('Recognition URL is required')
    expect(() => linkedinShareUrl(null)).toThrow('Recognition URL is required')
    expect(() => linkedinShareUrl('')).toThrow()
  })

  it('rejects malformed URLs', () => {
    expect(() => linkedinShareUrl('not a url')).toThrow('Invalid recognition URL')
  })

  it('rejects URLs outside the configured recognition origin', () => {
    process.env.NEXT_PUBLIC_RECOGNITION_BASE_URL = 'https://recognition.company.com'
    for (const bad of ['http://recognition.company.com/recognition/rc1', 'https://evil.com/recognition/rc1']) {
      expect(() => linkedinShareUrl(bad)).toThrow('Invalid recognition URL')
    }
  })

  it('allows the overriden origin end to end, protocol included', () => {
    process.env.NEXT_PUBLIC_RECOGNITION_BASE_URL = 'http://localhost:8080'
    const page = recognitionPageUrl('rc1')
    const share = new URL(linkedinShareUrl(page))
    expect(share.searchParams.get('url')).toBe(page)
  })
})

describe('recognitionBase', () => {
  it('falls back to the production default when unset or blank', () => {
    process.env.NEXT_PUBLIC_RECOGNITION_BASE_URL = '  '
    expect(recognitionBase()).toBe('https://recognition.company.com')
  })
})

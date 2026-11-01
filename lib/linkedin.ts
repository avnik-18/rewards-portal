// Share on LinkedIn — the standard share-offsite hand-off URL, no OAuth,
// no publishing API. The share points at the recognition record's canonical
// public page on the separate recognition site (mocked in ../linkedin/).

const DEFAULT_BASE = 'https://recognition.company.com'

/** Canonical base of the public recognition site; override per environment. */
export function recognitionBase(): string {
  const configured = process.env.NEXT_PUBLIC_RECOGNITION_BASE_URL?.trim()
  return configured || DEFAULT_BASE
}

/** Stable public URL of a recognition record, e.g. {base}/recognition/rc1. */
export function recognitionPageUrl(id: string): string {
  const base = new URL(recognitionBase())
  return new URL(`/recognition/${encodeURIComponent(id)}`, base).toString()
}

/**
 * Build the LinkedIn share-offsite URL for a recognition page URL.
 * Throws when the URL is missing, malformed or not on the configured
 * recognition origin — callers show the fallback message and open nothing.
 */
export function linkedinShareUrl(recognitionUrl: string | undefined | null): string {
  if (!recognitionUrl) {
    throw new Error('Recognition URL is required')
  }

  let target: URL
  try {
    target = new URL(recognitionUrl)
  } catch {
    throw new Error('Invalid recognition URL')
  }
  const allowed = new URL(recognitionBase())

  // origin match pins protocol, host and port to the configured public site
  if (target.origin !== allowed.origin) {
    throw new Error('Invalid recognition URL')
  }

  const share = new URL('https://www.linkedin.com/sharing/share-offsite/')
  share.searchParams.set('url', target.toString())
  return share.toString()
}

import { apiFetch } from '../api-client'

/** The live hero placement row, verbatim from media_asset's DTO
 *  (GET /media/hero). Field names are the backend's — no rename layer. */
export interface HeroMedia {
  id: string
  title: string
  url: string
  poster_url: string | null
  cta_label: string | null
  cta_url: string | null
}

/**
 * The hero currently published in the media registry, or null when the
 * Home screen should fall back to the bundled static asset. Null covers
 * 404 (nothing published) AND any transient failure equally — the hero
 * must degrade to the static file, never blank the page: matching on
 * `detail` strings is fragile, status codes are not.
 */
export async function getHeroMedia(): Promise<HeroMedia | null> {
  try {
    return await apiFetch<HeroMedia>('/media/hero')
  } catch {
    return null
  }
}

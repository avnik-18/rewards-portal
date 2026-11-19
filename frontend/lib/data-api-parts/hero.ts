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
 * The deployed demo ships with the hero unpublished — null makes the Home
 * screen fall back to the bundled static asset. The app never depends on a
 * reachable media registry here. */
export async function getHeroMedia(): Promise<HeroMedia | null> {
  return null
}

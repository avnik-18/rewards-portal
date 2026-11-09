/**
 * Client-side page-data hook — replaces Next.js async server components.
 * The data-api façade stays the single swap point: today it resolves mock
 * data instantly; tomorrow it fetches from FastAPI — the hook handles both.
 */
import { useEffect, useState } from 'react'

type Loader<T> = () => Promise<T>

export function usePageData<T>(loader: Loader<T>, deps: unknown[] = []): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    loader().then((result) => {
      if (!cancelled) setData(result)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return data
}

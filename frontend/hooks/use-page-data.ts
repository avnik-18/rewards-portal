/**
 * Client-side page-data hook — replaces Next.js async server components.
 * The data-api façade stays the single swap point: today it resolves mock
 * data instantly; tomorrow it fetches from FastAPI — the hook handles both.
 *
 * Returns { data, error, isLoading }: callers render a loading skeleton, an
 * error state with retry, and the page — a rejected loader never leaves the
 * UI blank again (sir's review: rejections were unhandled).
 *
 * deps is REQUIRED so pages that read search params refetch when the params
 * change (React Router reuses route components across query-string changes).
 * No state is written synchronously inside the effect: while the running
 * deps differ from the stored ones, the snapshot below is treated as loading.
 */
import { useEffect, useState } from 'react'

export interface PageData<T> {
  data: T | undefined
  error: Error | undefined
  isLoading: boolean
}

interface Snapshot<T> extends PageData<T> {
  deps: unknown[]
}

const shallowEqualArrays = (a: unknown[], b: unknown[]) =>
  a.length === b.length && a.every((entry, index) => entry === b[index])

export function usePageData<T>(loader: () => Promise<T>, deps: unknown[]): PageData<T> {
  const [snapshot, setSnapshot] = useState<Snapshot<T>>({ deps: [], data: undefined, error: undefined, isLoading: false })

  useEffect(() => {
    let cancelled = false
    loader().then(
      (result) => {
        if (cancelled) return
        setSnapshot({ deps, data: result, error: undefined, isLoading: false })
      },
      (cause: unknown) => {
        if (cancelled) return
        setSnapshot({
          deps,
          data: undefined,
          error: cause instanceof Error ? cause : new Error(String(cause)),
          isLoading: false,
        })
      },
    )
    return () => {
      cancelled = true
    }
  }, deps)

  // Load-in-flight state is DERIVED (no sync setState inside the effect): until
  // the effect for the current deps resolves, the snapshot belongs to older deps.
  if (shallowEqualArrays(snapshot.deps, deps)) {
    return { data: snapshot.data, error: snapshot.error, isLoading: snapshot.isLoading }
  }
  return { data: undefined, error: undefined, isLoading: true }
}

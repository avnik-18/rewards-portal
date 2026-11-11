import { useSearchParams } from 'react-router-dom'
import { getPeople } from '@/lib/data-api'
import { ComposeForm } from './compose-form'
import { usePageData } from '@/hooks/use-page-data'
import { usePageTitle } from '@/hooks/use-page-title'
import { ErrorState, LoadingSkeleton } from '../load-ui'

// Data resolves from the mock facade while the FastAPI backend is being built.
export default function ComposePage() {
  usePageTitle('Recognize')
  const [searchParams] = useSearchParams()
  const to = searchParams.get('to') ?? undefined
  const { data: people, error, isLoading } = usePageData(getPeople, [])

  if (isLoading) return <LoadingSkeleton label="Loading the composer…" />
  if (error) return <ErrorState error={error} />
  if (!people) return null

  // key={to}: a changed ?to= remounts the composer, and the recipient preset
  // is seeded as the hook's initial state (validated against the directory).
  return <ComposeForm key={to ?? ''} people={people} initialToId={to} />
}

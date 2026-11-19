import { useSearchParams } from 'react-router-dom'
import { getMe, getPeople } from '@/lib/data-api'
import { ComposeForm } from './compose-form'
import { usePageData } from '@/hooks/use-page-data'
import { usePageTitle } from '@/hooks/use-page-title'
import { ErrorState, LoadingSkeleton } from '../load-ui'

export default function ComposePage() {
  usePageTitle('Recognize')
  const [searchParams] = useSearchParams()
  const to = searchParams.get('to') ?? undefined
  const { data: people, error, isLoading } = usePageData(getPeople, [])
  const me = usePageData(getMe, [])

  if (isLoading || me.isLoading) return <LoadingSkeleton label="Loading the composer…" />
  if (error) return <ErrorState error={error} />
  if (!people) return null

  // Leaders (admins, team leads, people managers) attach points; plain
  // employees compose zero-point peer cheers.
  const canAwardPoints = me.data ? me.data.persona !== 'employee' : true

  // key={to}: a changed ?to= remounts the composer, and the recipient preset
  // is seeded as the hook's initial state (validated against the directory).
  return <ComposeForm key={to ?? ''} people={people} initialToId={to} canAwardPoints={canAwardPoints} />
}

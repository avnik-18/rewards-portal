import { useSearchParams } from 'react-router-dom'
import { getPeople } from '@/lib/data-api'
import { ComposeForm } from './compose-form'
import { usePageData } from '@/hooks/use-page-data'

// Data resolves from the mock facade while the FastAPI backend is being built.
export default function ComposePage() {
  const [searchParams] = useSearchParams()
  const to = searchParams.get('to') ?? undefined
  const people = usePageData(getPeople)
  if (!people) return null

  return <ComposeForm people={people} initialToId={to} />
}

import { getPeople } from '@/lib/data-api'
import { ComposeForm } from './compose-form'

// Data resolves from the mock facade while the FastAPI backend is being built.
export const dynamic = 'force-dynamic'

export interface ComposePageProps {
  /** `?to=<personId>` comes from Praise buttons that preset the recipient. */
  searchParams: Promise<{ to?: string }>
}

export default async function ComposePage({ searchParams }: ComposePageProps) {
  const [{ to }, people] = await Promise.all([searchParams, getPeople()])

  return <ComposeForm people={people} initialToId={to} />
}

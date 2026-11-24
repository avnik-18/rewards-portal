import { useSearchParams } from 'react-router-dom'
import TeamScreen from '@/components/organisms/TeamScreen'
import {
  getTeamDirectory,
  getRecognitionTree,
  getAwards,
  getPeopleDirectory,
  registerLivePeople,
  personDisplayName,
  type TeamRow,
  type ValueKey,
} from '@/lib/data-api'
import { usePageData } from '@/hooks/use-page-data'
import { usePageTitle } from '@/hooks/use-page-title'
import { ErrorState, LoadingSkeleton } from '../load-ui'

export default function TeamPage() {
  usePageTitle('My Team')
  const [search] = useSearchParams()
  // when an award card said "Nominate Employee", the roster rows carry the
  // nominate action for that award
  const awardId = search.get('award')
  const { data, error, isLoading } = usePageData(async () => {
    const [rows, tree, awards, live] = await Promise.all([
      getTeamDirectory(),
      getRecognitionTree(),
      awardId ? getAwards().catch(() => []) : Promise.resolve([]),
      awardId ? getPeopleDirectory().catch(() => []) : Promise.resolve([]),
    ])
    // a pending award turns the roster into the LIVE directory: nominations
    // key on backend user ids (the mock roster ids never reach the API)
    let liveRows: TeamRow[] = rows.slice()
    if (awardId && live.length > 0) {
      registerLivePeople(live.map((r) => ({
        id: r.id, name: r.full_name, email: r.email, title: r.title ?? '',
        dept: r.department ?? '', office: '', tenure: '', status: 'offline' as const,
      })))
      liveRows = live.map((r, index) => ({
        id: r.id,
        team: 'humana' as const,
        given: 0,
        received: 0,
        lastRecognized: '',
        valuesTop: (['impact_obsessed', 'trusted_guides', 'inclusive_innovators'] as unknown as Array<ValueKey>)[index % 3],
      }))
    }
    const award = awardId ? awards.find((a) => a.id === awardId) ?? null : null
    return { rows: liveRows, tree, award }
  }, [awardId])

  if (isLoading) return <LoadingSkeleton label="Loading your team…" />
  if (error) return <ErrorState error={error} />
  if (!data) return null

  return (
    <TeamScreen
      rows={data.rows}
      tree={data.tree}
      awardName={data.award?.name ?? null}
      nominateHref={data.award ? (id) => `/nominations/new?award=${awardId}&nominee=${id}` : undefined}
    />
  )
}

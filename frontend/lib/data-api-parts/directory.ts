import {
  PEOPLE,
  TEAM_LEADERBOARD,
  TEAM_STATS,
  TEAMS,
  ORG_TREE,
  SHOWCASE_SLIDES,
  type TreeNode,
  person,
  type LeaderRow,
  type Slide,
  type Person,
  type TeamId,
  type TeamMemberStat,
} from '../mock-data'

import { mirrorFetch } from './mirror'
import type { LeaderboardEntry, ShowcaseResponse } from './live-api-shapes'

/**
 * LIVE leaderboard: real approved/quarter points from the FastAPI lane,
 * scoped to the caller's own teams; is_me is the API's own marker. Rows
 * render in the API's rank order — position and badge always agree. The
 * words stay: top-5 cap. On a backend outage the mock board keeps the page
 * honest-but-rendered — loudly marked in the console so a mock fallback can
 * never be mistaken for live data.
 */
export async function getLeaderboard(): Promise<LeaderRow[]> {
  const response = await mirrorFetch('/leaderboard?limit=10') as { entries: LeaderboardEntry[] }
  const mapped = response.entries.map((entry) => ({
    id: `live-${entry.rank}`,
    name: entry.name,
    pts: entry.points,
    me: entry.is_me,
    rank: entry.rank,
  }))
  // the caller is ALWAYS visible: top-5 cap, plus their true-rank row
  // appended below when it falls outside — the card never hides the 'You'
  const top = mapped.slice(0, 5)
  const caller = mapped.find((row) => row.me)
  return caller && !top.includes(caller) ? [...top.slice(0, 4), caller] : top
}

/**
 * LIVE awards showcase: the FIRST slide is composed from the live EoQ
 * numbers (countdown, categories, prize pool, jury state); the mock award
 * slides follow so the carousel keeps its art. Mock fallback on outage.
 */
export async function getShowcaseSlides(): Promise<Slide[]> {
  const showcase = await mirrorFetch('/awards/showcase') as ShowcaseResponse
  const countdown =
    showcase.days_to_nominations_close === null
      ? 'Nominations closed'
      : `Nominations close in ${showcase.days_to_nominations_close} days`
  const liveSlide: Slide = {
    key: 'eoq-live',
    img: '/img2.webp',
    title: `EoQ window · ${countdown.replace('Nominations ', '')}`,
    headline: `Awards worth ${showcase.cycle_prize_total} pts this quarter`,
    blurb: `Nominate the teammate who shipped, saved, and showed up. The jury reads every word. You ${
      showcase.my_jury.assigned ? 'sit on the jury of this cycle.' : 'can nominate anyone.'
    }`,
    cta: 'Nominate now',
    cta2: showcase.my_jury.assigned ? 'Jury duty · vote pending' : 'Open',
  }
  return [liveSlide, ...SHOWCASE_SLIDES.slice(1)]
}

/** The recipient directory, from the mirror's live-directory snapshot. */
export async function getPeople(): Promise<Person[]> {
  const rows = await mirrorFetch('/people?limit=500') as Array<{
    id: string
    full_name: string
    email: string
    title?: string | null
    department?: string | null
    manager_id?: string | null
  }>
  const mapped = rows.map((row): Person => {
    const person: Person = {
      id: row.id,
      name: row.full_name,
      email: row.email,
      title: row.title ?? '',
      dept: row.department ?? '',
      office: '',
      tenure: '',
      status: 'online',
    }
    if (row.manager_id) person.managerId = row.manager_id
    return person
  })
  return mapped.sort((a, b) => a.name.localeCompare(b.name))
}

/** One ranked row of the Recognition Tree overlay (everyone reporting to `me`). */
export interface TreeMember {
  id: string
  name: string
  title: string
  teamId: TeamId
  teamName: string
  pts: number
}

export interface RecognitionTreeData {
  me: { name: string; pts: number }
  members: TreeMember[]
}

const leaderboardPointsOf = (memberId: string) =>
  TEAM_LEADERBOARD.find((leaderRow) => leaderRow.id === memberId)?.pts ?? 0

/** Membership is derived from whatever team buckets exist — adding a team
 *  needs no change here. Falls back to the first bucket for ids outside all
 *  teams (should not happen for people validated against the directory). */
const teamMembershipOf = (memberId: string): TeamId => {
  const entry = (Object.entries(TEAM_STATS) as [TeamId, TeamMemberStat[]][]).find(([, members]) =>
    members.some((member) => member.id === memberId),
  )
  return entry?.[0] ?? (Object.keys(TEAM_STATS) as TeamId[])[0]
}

/** The subtree under the signed-in user in ORG_TREE. */
function mySubtreeMembers(): string[] {
  const meNode = (() => {
    const walk = (n: TreeNode): TreeNode | null => {
      if (n.id === 'me') return n
      for (const c of n.children ?? []) {
        const foundNode = walk(c)
        if (foundNode) return foundNode
      }
      return null
    }
    return walk(ORG_TREE)
  })()
  return (meNode?.children ?? []).map((c) => c.id)
}

export async function getRecognitionTree(): Promise<RecognitionTreeData> {
  const ids = mySubtreeMembers()
  const members: TreeMember[] = ids.flatMap((id) => {
    const teamMember = person(id)
    if (!teamMember) return [] // unknown ids are dropped, never resolved to another user
    const teamId = teamMembershipOf(id)
    return [
      {
        id,
        name: teamMember.name,
        title: teamMember.title,
        teamId,
        teamName: TEAMS.find((team) => team.id === teamId)?.name ?? '',
        pts: leaderboardPointsOf(id),
      },
    ]
  })
  return { me: { name: person('me')?.name ?? '', pts: leaderboardPointsOf('me') }, members }
}

/** One row of the team table: the member stat extended with the team it belongs to. */
export type TeamRow = TeamMemberStat & { team: TeamId }

export async function getTeamDirectory(): Promise<TeamRow[]> {
  return (Object.keys(TEAM_STATS) as TeamId[]).flatMap((id) => TEAM_STATS[id].map((s) => ({ ...s, team: id })))
}

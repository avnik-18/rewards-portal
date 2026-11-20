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
import { apiFetch } from '../api-client'

/** The Manage screen's directory: backend GET /people rows — one
 *  recognizable person plus their manager for the chain view. */
export interface DirectoryPerson {
  id: string
  employee_code: string
  full_name: string
  email: string
  title: string | null
  department: string | null
  manager_code: string | null
  manager_name: string | null
}

export async function getPeopleDirectory(): Promise<DirectoryPerson[]> {
  return apiFetch<DirectoryPerson[]>('/people')
}

export async function getLeaderboard(): Promise<LeaderRow[]> {
  return TEAM_LEADERBOARD
}

export async function getShowcaseSlides(): Promise<Slide[]> {
  return SHOWCASE_SLIDES
}

export async function getPeople(): Promise<Person[]> {
  return Object.values(PEOPLE)
    .filter((teamMember) => teamMember.id !== 'me')
    .sort((a, b) => a.name.localeCompare(b.name))
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

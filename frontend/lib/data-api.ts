// The single data swap point. Today everything resolves from mock data;
// when the FastAPI backend lands, each function becomes one fetch call
// (e.g. `${API_BASE}/leaderboard`) and no component changes.

import {
  PEOPLE,
  TEAM_LEADERBOARD,
  TEAM_STATS,
  TEAMS,
  ORG_TREE,
  type TreeNode,
  ORG_STATS,
  DASH_STATS,
  SHOWCASE_SLIDES,
  APPROVALS,
  REWARDS_SUMMARY,
  RECEIVED,
  LEDGER,
  VALUES_LIVED,
  MY_EOQ_AWARDS,
  POSTS,
  NOTIFICATIONS,
  person,
  type LeaderRow,
  type Slide,
  type Person,
  type ApprovalItem,
  type RewardSummary,
  type RecognitionReceived,
  type LedgerEntry,
  type ValueLived,
  type EoQAward,
  type Post,
  type NotificationItem,
  type TeamId,
  type TeamMemberStat,
} from './mock-data'

export async function getMe(): Promise<{ name: string }> {
  return { name: 'Ayan' }
}

export async function getDashboardStats(): Promise<{
  balance: number
  given: number
  got: number
  orgRecognitions: number
}> {
  return {
    balance: 1240,
    given: DASH_STATS.given,
    got: DASH_STATS.got,
    orgRecognitions: ORG_STATS.recognitions,
  }
}

export async function getLeaderboard(): Promise<LeaderRow[]> {
  return TEAM_LEADERBOARD
}

export async function getShowcaseSlides(): Promise<Slide[]> {
  return SHOWCASE_SLIDES
}

/** One ranked row of the Recognition Tree overlay (everyone reporting to `me`). */
export interface TreeMember {
  id: string
  name: string
  title: string
  teamId: 'humana' | 'dev'
  teamName: string
  pts: number
}

export interface RecognitionTreeData {
  me: { name: string; pts: number }
  members: TreeMember[]
}

const leaderboardPointsOf = (memberId: string) => TEAM_LEADERBOARD.find((leaderRow) => leaderRow.id === memberId)?.pts ?? 0
const teamMembershipOf = (memberId: string): "humana" | "dev" => (TEAM_STATS.humana.some((team) => team.id === memberId) ? "humana" : "dev")

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
  const members: TreeMember[] = ids.map((id) => {
    const teamMember = person(id)
    const teamId = teamMembershipOf(id)
    return {
      id,
      name: teamMember.name,
      title: teamMember.title,
      teamId,
      teamName: TEAMS.find((t) => t.id === teamId)?.name ?? '',
      pts: leaderboardPointsOf(id),
    }
  })
  return { me: { name: person('me').name, pts: leaderboardPointsOf('me') }, members }
}

/** Recognizable teammates (everyone except the signed-in user), sorted by name. */
export async function getPeople(): Promise<Person[]> {
  return Object.values(PEOPLE)
    .filter((teamMember) => teamMember.id !== "me")
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getApprovals(): Promise<ApprovalItem[]> {
  return APPROVALS
}

/** One row of the team table: the member stat extended with the team it belongs to. */
export type TeamRow = TeamMemberStat & { team: TeamId }

export async function getTeamDirectory(): Promise<TeamRow[]> {
  return (Object.keys(TEAM_STATS) as TeamId[]).flatMap((id) => TEAM_STATS[id].map((s) => ({ ...s, team: id })))
}

export async function getNotifications(): Promise<NotificationItem[]> {
  return NOTIFICATIONS
}

export interface ProfilePayload {
  id: string
  name: string
  title: string
  dept: string
  office: string
  tenure: string
  managerName: string | null
  received: Post[]
  given: Post[]
}

export async function getProfile(id: string): Promise<ProfilePayload> {
  const teamMember = person(id)
  const received = POSTS.filter((x) => x.toIds.includes(id))
  const given = POSTS.filter((x) => x.fromId === id)
  return {
    id: teamMember.id,
    name: teamMember.name,
    title: teamMember.title,
    dept: teamMember.dept,
    office: teamMember.office,
    tenure: teamMember.tenure,
    managerName: teamMember.managerId ? person(teamMember.managerId).name : null,
    received,
    given,
  }
}

export interface RewardsPayload {
  summary: RewardSummary
  received: RecognitionReceived[]
  ledger: LedgerEntry[]
  valuesLived: ValueLived[]
  eoqAwards: EoQAward[]
}

export async function getRewards(): Promise<RewardsPayload> {
  return { summary: REWARDS_SUMMARY, received: RECEIVED, ledger: LEDGER, valuesLived: VALUES_LIVED, eoqAwards: MY_EOQ_AWARDS }
}

export interface RecognitionPayload {
  toIds: string[]
  ccIds?: string[]
  valueKey: string
  message: string
  points: number
  artUrl?: string
  tplId?: string
}

export interface CreatedRecognition {
  id: string
  fromId: string
  toIds: string[]
  ccIds: string[]
  valueKey: string
  message: string
  points: number
  artUrl?: string
  when: string
}

/** Mock send: returns the created recognition immediately. */
export async function sendRecognition(input: RecognitionPayload): Promise<CreatedRecognition> {
  const first = input.toIds[0]
  void person(first) // keeps the mock facade wired for the FastAPI swap and gives a sensible wrong-id crash in dev
  return {
    id: 'r' + Date.now(),
    fromId: 'me',
    toIds: input.toIds,
    ccIds: input.ccIds ?? [],
    valueKey: input.valueKey,
    message: input.message,
    points: input.points,
    artUrl: input.artUrl,
    when: 'Just now',
  }
}

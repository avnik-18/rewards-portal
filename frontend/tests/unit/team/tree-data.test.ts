import { describe, it, expect } from 'vitest'
import { getRecognitionTree, getTeamDirectory } from '@/lib/data-api'
import { TEAM_STATS } from '@/lib/mock-data'

describe('getRecognitionTree (data layer)', () => {
  it('builds the subtree under the signed-in user with team and point lookups', async () => {
    const tree = await getRecognitionTree()

    expect(tree.me.name).toBeTruthy()
    expect(tree.me.pts).toBeGreaterThanOrEqual(0)

    // every listed member resolves through the directory and carries team data
    for (const member of tree.members) {
      expect(member.id).toBeTruthy()
      expect(member.name).toBeTruthy()
      expect(member.teamId).toBeTruthy()
      expect(member.teamName).toBeTruthy()
      expect(member.pts).toBeGreaterThanOrEqual(0)
    }
    // member ids are unique — unknown ids are dropped, never duplicated
    expect(new Set(tree.members.map((m) => m.id)).size).toBe(tree.members.length)
  })
})

describe('getTeamDirectory (data layer)', () => {
  it('flattens the team buckets into one row per member with its team attached', async () => {
    const rows = await getTeamDirectory()

    const expected = (Object.keys(TEAM_STATS) as (keyof typeof TEAM_STATS)[]).reduce(
      (sum, team) => sum + TEAM_STATS[team].length,
      0,
    )
    expect(rows).toHaveLength(expected)
    for (const row of rows) {
      expect(TEAM_STATS[row.team] ?? []).toContainEqual(expect.objectContaining({ id: row.id }))
    }
  })
})

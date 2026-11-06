import { POSTS, person, type Post } from '../mock-data'

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

export async function getProfile(id: string): Promise<ProfilePayload | null> {
  // sir's PR review: unknown ids must return null for notFound() — never
  // fall back to another person's profile
  const teamMember = person(id)
  if (!teamMember) return null
  const received = POSTS.filter((x) => x.toIds.includes(id))
  const given = POSTS.filter((x) => x.fromId === id)
  return {
    id: teamMember.id,
    name: teamMember.name,
    title: teamMember.title,
    dept: teamMember.dept,
    office: teamMember.office,
    tenure: teamMember.tenure,
    managerName: teamMember.managerId ? person(teamMember.managerId)?.name ?? null : null,
    received,
    given,
  }
}

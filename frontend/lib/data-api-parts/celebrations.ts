/** Today's celebrations (birthdays / work anniversaries) shown in the
 *  dashboard right rail. Mock dataset now; becomes GET /celebrations. */
export interface Celebration {
  id: string
  kind: 'birthday' | 'anniversary' | 'milestone'
  detail: string
}

const CELEBRATIONS: Celebration[] = [
  { id: 'p8', kind: 'anniversary', detail: '8 years at emids today' },
  { id: 'p5', kind: 'birthday', detail: 'Birthday today' },
  { id: 'p2', kind: 'birthday', detail: 'Birthday today' },
]

export async function getCelebrations(): Promise<Celebration[]> {
  return CELEBRATIONS
}

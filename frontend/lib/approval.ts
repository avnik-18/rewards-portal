import type { ApprovalItem, ApprovalKind, ApprovalRouteStep } from './mock-data'

export type ApprovalVerdict = 'approved' | 'returned' | 'declined'

/** A stored decision with its audit note. */
export interface ApprovalDecision {
  verdict: ApprovalVerdict
  note: string
}

/** Human label shown in the approval detail header. */
export const kindLabel = (kind: ApprovalKind, points?: number): string => {
  if (kind === 'nomination-endorsement') return 'Nomination endorsement'
  if (kind === 'high-value-redemption') return 'High-value redemption'
  return points ? `Points approval · +${points} pts` : 'Points approval'
}

/** Steps still waiting for a decision, in routing order. */
export const openSteps = (route: ApprovalRouteStep[]): ApprovalRouteStep[] => route.filter((step) => !step.done)

/** Approvals the approver can still act on = nothing decided and their step is next. */
export const isActionable = (item: ApprovalItem, viewerId = 'me'): boolean =>
  openSteps(item.route)[0]?.owner === viewerId

/** Verdict-only view of stored decisions, for folder filtering. */
export const verdictOf = (decision: ApprovalDecision | undefined): ApprovalVerdict | undefined =>
  decision?.verdict

/** True only for items whose first open step belongs to the viewer. */
export const isUndecided = (decision: ApprovalDecision | undefined): boolean => decision === undefined

/** True only for items whose first open step belongs to the viewer. */
export const filterForTab = (
  items: ApprovalItem[],
  tab: 'inbox' | 'endorse' | 'done',
  decided: Record<string, ApprovalDecision>,
): ApprovalItem[] => {
  if (tab === 'done') return items.filter((item) => decided[item.id] !== undefined)
  if (tab === 'endorse')
    return items.filter((item) => item.kind === 'nomination-endorsement' && decided[item.id] === undefined)
  return items.filter((item) => item.kind !== 'nomination-endorsement' && decided[item.id] === undefined)
}

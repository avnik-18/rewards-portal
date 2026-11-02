import type { ApprovalItem, ApprovalKind, ApprovalRouteStep } from './mock-data'

export type ApprovalVerdict = 'approved' | 'returned' | 'declined'

/** Human label shown in the approval detail header. */
export const kindLabel = (kind: ApprovalKind, points?: number): string => {
  if (kind === 'nomination-endorsement') return 'Nomination endorsement'
  if (kind === 'high-value-redemption') return 'High-value redemption'
  return points ? `Points approval · +${points} pts` : 'Points approval'
}

/** Steps still waiting for a decision, in routing order. */
export const openSteps = (route: ApprovalRouteStep[]): ApprovalRouteStep[] => route.filter((s) => !s.done)

/** Approvals the approver can still act on = nothing decided and their step is next. */
export const isActionable = (item: ApprovalItem, viewerId = 'me'): boolean =>
  openSteps(item.route)[0]?.owner === viewerId

/** True only for items whose first open step belongs to the viewer. */
export const filterForTab = (
  items: ApprovalItem[],
  tab: 'inbox' | 'endorse' | 'done',
  decided: Record<string, ApprovalVerdict>,
): ApprovalItem[] => {
  if (tab === 'done') return items.filter((a) => decided[a.id] !== undefined)
  if (tab === 'endorse') return items.filter((a) => a.kind === 'nomination-endorsement' && decided[a.id] === undefined)
  return items.filter((a) => a.kind !== 'nomination-endorsement' && decided[a.id] === undefined)
}

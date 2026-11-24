/**
 * Excellence awards: nomination lifecycle reads/writes (live API).
 * Award/nomination shapes mirror the FastAPI schemas in
 * D:\demo\api\app\schemas\nominations.py.
 */
import { apiFetch, apiPost, apiPut, apiDelete } from '../api-client'

export interface AwardQuotaStatus {
  scope: string
  scope_value: string
  max_count: number
  used: number
}

export interface NominatedAward {
  award_id: string
  name: string
  description: string | null
  prize_points: number
  max_nominations_per_nominator: number
  used_by_nominator: number
  allow_self: boolean
  allow_team: boolean
  min_team_size: number
  member_level_max: string | null
  grades: string[]
  departments: string[]
  min_tenure_months: number | null
  quotas: AwardQuotaStatus[]
  nominations_end: string | null
}

export interface NomineeRow {
  id: string
  full_name: string
  title: string | null
  department: string | null
}

export type NominationStatus =
  | 'draft' | 'submitted' | 'under_review' | 'endorsed'
  | 'approved' | 'returned' | 'not_selected' | 'result'

export interface NominationRow {
  id: string
  nomination_ref: string | null
  award_id: string
  award_name: string
  prize_points: number
  status: NominationStatus
  team_id: string | null
  team_name: string | null
  is_team_nomination: boolean
  nominees: NomineeRow[]
  nominator_id: string
  nominator_name: string
  mine_to_manage: boolean
  story: string
  core_values: string[]
  achievements: string | null
  support_doc_url: string | null
  is_self_nomination: boolean
  returned_notes: string | null
  created_at: string
}

export interface ApprovalHistoryEntry {
  seq: number
  level: string
  owner_id: string
  owner_name: string
  status: string
  note: string | null
  decided_at: string | null
}

export interface NominationDetail extends NominationRow {
  approval_history: ApprovalHistoryEntry[]
  can_edit: boolean
}

export interface PendingEndorsement {
  item_id: string
  nomination_id: string
  nomination_ref: string | null
  award_name: string
  nominator_id: string
  nominator_name: string
  nominees: NomineeRow[]
  team_name: string | null
  story: string
  core_values: string[]
  achievements: string | null
  support_doc_url: string | null
  arrived_at: string
}

export interface NominationDraftInput {
  award_id: string
  nominee_id?: string
  team_id?: string
  story: string
  core_values: string[]
  achievements?: string | null
  support_doc_url?: string | null
}

const SCAN = '/nominations'

export async function getOpenAwards(): Promise<NominatedAward[]> {
  const d = await apiFetch<{ awards: NominatedAward[] }>(`${SCAN}/awards`)
  return d.awards
}

export interface TeamChoice {
  team_id: string
  name: string
  member_count: number
  lead_id: string | null
}

export async function getTeamChoices(): Promise<TeamChoice[]> {
  return apiFetch<TeamChoice[]>(`${SCAN}/teams`)
}

export interface DraftAwardRow {
  award_id: string
  name: string
  description: string | null
  prize_points: number
  max_nominations_per_nominator: number
  nominations_end: string | null
}

export async function getDraftAwards(): Promise<DraftAwardRow[]> {
  const d = await apiFetch<{ drafts: DraftAwardRow[] }>('/nominations/awards/drafts')
  return d.drafts
}

export async function releaseAward(awardId: string): Promise<void> {
  await apiPost<{ released: boolean }>(`/nominations/awards/${awardId}/release`, {})
}

export async function getMyNominations(): Promise<NominationRow[]> {
  const d = await apiFetch<{ items: NominationRow[] }>(`${SCAN}/mine`)
  return d.items
}

export async function getManagedNominations(): Promise<NominationRow[]> {
  const d = await apiFetch<{ items: NominationRow[] }>(`${SCAN}/manage`)
  return d.items
}

export async function getPendingEndorsements(): Promise<PendingEndorsement[]> {
  const d = await apiFetch<{ items: PendingEndorsement[] }>(`${SCAN}/approvals/pending`)
  return d.items
}

export async function getNomination(id: string): Promise<NominationDetail> {
  return apiFetch<NominationDetail>(`${SCAN}/${id}`)
}

export async function createNominationDraft(input: NominationDraftInput): Promise<{ id: string; status: string }> {
  return apiPost<{
    id: string
    status: string
  }>(`${SCAN}/draft`, {
    award_id: input.award_id,
    nominee_id: input.nominee_id ?? null,
    team_id: input.team_id ?? null,
    story: input.story,
    core_values: input.core_values,
    achievements: input.achievements ?? null,
    support_doc_url: input.support_doc_url ?? null,
  })
}

export async function updateNominationDraft(id: string, input: NominationDraftInput): Promise<{ id: string }> {
  return apiPut<{ id: string }>(`${SCAN}/${id}`, {
    award_id: input.award_id,
    nominee_id: input.nominee_id ?? null,
    team_id: input.team_id ?? null,
    story: input.story,
    core_values: input.core_values,
    achievements: input.achievements ?? null,
    support_doc_url: input.support_doc_url ?? null,
  })
}

export async function discardNominationDraft(id: string): Promise<void> {
  await apiDelete<{ deleted: boolean }>(`${SCAN}/${id}`)
}

export async function submitNomination(id: string): Promise<{
  nomination_id: string
  nomination_ref: string
  status: string
  routed_to: number
}> {
  return apiPost<{
    nomination_id: string
    nomination_ref: string
    status: string
    routed_to: number
  }>(`${SCAN}/${id}/submit`, {})
}

export async function decideNomination(
  itemId: string,
  verdict: 'approve' | 'reject' | 'return',
  note: string | null,
): Promise<{ item_id: string; nomination_id: string; nomination_ref: string | null; status: string; verdict: string }> {
  return apiPost<{
    item_id: string
    nomination_id: string
    nomination_ref: string | null
    status: string
    verdict: string
  }>(`${SCAN}/approval/${itemId}/decide`, { verdict, note: note ?? null })
}

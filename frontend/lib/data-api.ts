// The single data swap point, split by domain under lib/data-api-parts/.
// Today everything resolves from mock data; when the FastAPI backend lands,
// each function becomes one fetch call (e.g. `${API_BASE}/leaderboard`) and
// no component changes.

export { getMe, WELCOME_BONUS_POINTS, getDashboardStats, type MeProfile } from './data-api-parts/me'
export { getDemoUsers, type AuthUser } from './data-api-parts/auth-users'
export { getHeroMedia, type HeroMedia } from './data-api-parts/hero'
export {
  getLeaderboard,
  getShowcaseSlides,
  getPeople,
  getRecognitionTree,
  getTeamDirectory,
  type TreeMember,
  type RecognitionTreeData,
  type TeamRow,
} from './data-api-parts/directory'
export {
  getApprovals,
  getNotifications,
  getFeedPosts,
  getUnreadCount,
  getUnreadFeed,
  markAllNotificationsRead,
  decideApproval,
} from './data-api-parts/activity'
export { getCelebrations, type Celebration } from './data-api-parts/celebrations'
export { getProfile, type ProfilePayload } from './data-api-parts/profile'

// Domain types re-exported from the data layer — the façade is the type
// source the UI reads from (mock dataset stays behind lib/data-api*)
export type { Person } from './mock-data-parts/people-records'
export type { Post, NotificationItem } from './mock-data-parts/posts-notifications'
export type {
  RewardSummary,
  LedgerEntry,
  RecognitionReceived,
  EarningBreakdown,
  LedgerKind,
} from './mock-data-parts/rewards'
export type { Slide, ApprovalItem, ApprovalKind, ApprovalRouteStep } from './mock-data-parts/showcase-approvals'
export type { LeaderRow, TeamMemberStat } from './mock-data-parts/team'
export type { CoreValue, EoQAward, PraiseTemplate } from './mock-data-parts/values'
export { getRewards, type RewardsPayload } from './data-api-parts/rewards'
export {
  person,
  initials,
  personDisplayName,
  TEAMS,
  type TeamId,
  CORE_VALUES,
  VALUE_KEYS,
  VALUE_TEMPLATES,
  type ValueKey,
  type ValueLived,
} from './data-api-parts/lookups'
export { sendRecognition, SendRejected, type RecognitionPayload, type CreatedRecognition } from './data-api-parts/recognitions'
export { ensureLookupsLive, registerLivePeople } from './data-api-parts/lookups'

// Mock-deploy mirror — serves the captured DTO snapshot instead of the API.
// The raw capture was taken from the RUNNING demo backend (same people,
// points, feed posts as the seeded demo), so a deployed build looks like the
// real product without any backend reachable.
import mirrorRaw from './mirror-raw.json'
import { activeDemoUser } from '../demo-auth'

interface MirrorRaw {
  demo_users: Array<{ employee_code: string }>
  people: Array<{ id: string; full_name: string }>
  values: Array<{ id: string; key: string; label: string; templates: Array<{ art_urls?: string[] }> }>
  showcase: {
    days_to_nominations_close: number | null
    open_categories: number
    cycle_prize_total: number
    my_jury: { cast: boolean; assigned: boolean }
  }
  count: number
  hero: unknown
  per_user: Record<string, {
    me: { id: string; full_name: string; role: string }
    stats: { points_balance: number; recognitions_given: number; recognitions_received: number }
    leaderboard: Array<{ rank: number; name: string; points: number; is_me: boolean }>
    unread: number
    feed: Array<{ recognition_id: string; tier: string; occurred_at: string; giver_id: string | null; giver_name: string | null; kind: string; message: string; points: number; value_label: string | null; recipients: Array<{ user_id: string; name: string; points: number; kind: string }> }>
    notifications: Array<{ id: string; type: string; giver_name: string | null; points: number | null; message: string | null; created_at: string }>
    approvals: Array<{ approval_item_id: string; kind: string; level: string; mode: string; owner_id: string; submitter_name: string; points: number; note: string | null }>
  }>
}

const mirror = mirrorRaw as unknown as MirrorRaw

function zone() {
  return activeDemoUser() || mirror.demo_users[0]?.employee_code
}

function bucket(code: string) {
  const entry = mirror.per_user[code]
  return entry ?? mirror.per_user[mirror.demo_users[0].employee_code]
}

/** Serves the captured DTOs for path — the same routes the real API answers. */
export function mirrorFetch(path: string): Promise<unknown> {
  const entry = bucket(zone())
  if (path.startsWith('/auth/demo-users')) return Promise.resolve(mirror.demo_users)
  if (path.startsWith('/people')) return Promise.resolve(mirror.people)
  if (path.startsWith('/values')) {
    // templates arrive keyed to the demo CDN (unreachable on a deployed app)
    // — swap to the bundled /xoxo art by basename, like lookups does live
    for (const value of mirror.values)
      for (const template of value.templates)
        template.art_urls = (template.art_urls ?? []).map((url: string) => {
          const base = url.split('/').pop() ?? ''
          return `/xoxo/${base.replace(/[.-]+/g, '_')}`
        })
    return Promise.resolve(mirror.values)
  }
  if (path.startsWith('/leaderboard')) return Promise.resolve({ entries: entry.leaderboard })
  if (path.startsWith('/awards/showcase')) return Promise.resolve(mirror.showcase)
  if (path.startsWith('/media/hero')) {
    return Promise.reject(new Error('hero_not_published'))
  }
  if (path.startsWith('/notifications/unread-count')) return Promise.resolve({ unread_count: entry.unread })
  if (path.startsWith('/notifications/read')) return Promise.resolve({ marked_read: entry.unread })
  if (path.startsWith('/notifications')) return Promise.resolve(entry.notifications)
  if (path.startsWith('/recognitions/approvals')) return Promise.resolve(entry.approvals)
  if (path.startsWith('/feed')) {
    const persona = entry.me.role === 'leader' || entry.me.role === 'admin' ? 'leader' : 'employee'
    return Promise.resolve({ persona, items: entry.feed, next_cursor: null })
  }
  if (path === '/me') return Promise.resolve(entry.me)
  if (path.startsWith('/me/stats')) {
    return Promise.resolve({
      points_balance: entry.stats.points_balance,
      allowance_left: null,
      allowance_allocated: null,
      recognitions_given: entry.stats.recognitions_given,
      recognitions_received: entry.stats.recognitions_received,
    })
  }
  if (path.startsWith('/recognitions/count')) return Promise.resolve({ total: mirror.count })
  return Promise.reject(new Error(`mirror has no route for ${path}`))
}

/** mirrorPost — the offline POST /recognitions: generates the response shape
 *  the real fn_submit_recognition returns, and mutates the in-session mirror
 *  so the feed, bell and approvals reflect the new recognition instantly. */
export function mirrorPost(route: string, body: { to_user_ids: string[]; cc_user_ids: string[]; points: number; message: string; art_url?: string }): Promise<Record<string, unknown>> {
  const entry = bucket(zone())
  const me = entry.me
  const people = mirror.people
  const nameOf = (id: string) => people.find((person) => person.id === id)?.full_name ?? 'a teammate'
  const recognitionId = `mr-${Date.now().toString(36)}`
  const recipients = body.to_user_ids.map((userId) => ({
    user_id: userId,
    name: nameOf(userId),
    points: 0,
    kind: 'to',
  })) as Array<{ user_id: string; name: string; points: number; kind: string }>
  const autoApproved = body.points === 0 || me.role === 'admin' || me.role === 'leader'

  const feedItem = {
    recognition_id: recognitionId,
    tier: 'own',
    occurred_at: new Date().toISOString(),
    giver_id: me.id,
    giver_name: me.full_name,
    kind: 'praise',
    message: body.message,
    points: body.points,
    value_label: null,
    recipients,
  }
  if (autoApproved) {
    for (const recipient of recipients) recipient.points = body.points
    entry.feed = [feedItem, ...(entry.feed as typeof entry.feed)]
    for (const recipient of recipients) {
      const theirs = mirror.per_user[recipient.user_id]
      if (theirs) {
        theirs.notifications = [
          {
            id: `mn-${recognitionId}`,
            type: 'praise_received',
            giver_name: me.full_name,
            points: body.points,
            message: body.message,
            created_at: new Date().toISOString(),
          },
          ...theirs.notifications,
        ]
        theirs.unread += 1
      }
    }
  } else {
    entry.approvals = [
      {
        approval_item_id: `ma-${recognitionId}`,
        submitter_name: me.full_name,
        points: body.points,
        note: body.message,
      },
      ...entry.approvals,
    ] as typeof entry.approvals
  }

  return Promise.resolve({
    recognition_id: recognitionId,
    status: autoApproved ? 'approved' : 'pending_approval',
    routed_to: autoApproved ? 0 : 1,
    approval_item_id: autoApproved ? null : `ma-${recognitionId}`,
  })
}

/** mark-read for the bell — zeroes the captured unread in-session. */
export function mirrorMarkRead(actor: string): number {
  const entry = bucket(actor)
  const marked = entry.unread
  entry.unread = 0
  return marked
}

export { mirror as MIRROR }

import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogIn } from 'lucide-react'
import { getDemoUsers } from '@/lib/data-api'
import { selectDemoUser } from '@/lib/demo-auth'
import { usePageData } from '@/hooks/use-page-data'
import { usePageTitle } from '@/hooks/use-page-title'

// dropdown order mirrors the production flow: who releases, who approves,
// who nominates, who watches
const USER_GROUPS = [
  { persona: 'admin', label: 'Admins' },
  { persona: 'dh', label: 'Department Heads' },
  { persona: 'leader', label: 'Leaders & Managers' },
  { persona: 'employee', label: 'Employees' },
] as const

/**
 * Local sign-in: "Continue with Emids SSO" hands the browser to the Entra
 * authorization flow (the dedicated SSO backend on :8100, proxied through
 * this dev server); until then the demo identity is picked from the
 * directory the backend serves. Selecting a person signs in AS them
 * immediately — every actor-scoped call resolves them from then on.
 */
export default function LoginPage() {
  usePageTitle('Sign in')
  const navigate = useNavigate()
  // retryN bumps as a dep so a failed load can simply re-run the fetch
  const [retryN, setRetryN] = useState(0)
  const users = usePageData(getDemoUsers, [retryN])
  const [picked, setPicked] = useState('')

  // the demo directory is grouped into the roles that matter for the live
  // flow — admins run the cycle, the department head approves, leaders
  // nominate their teams, everyone else just views
  const usersByGroup = (persona: string) =>
    (users.data ?? []).filter((u) => u.persona === persona)

  const signInAs = (employeeCode: string) => {
    selectDemoUser(employeeCode)
    navigate('/')
  }

  const onChange = (employeeCode: string) => {
    setPicked(employeeCode)
    if (employeeCode !== '') signInAs(employeeCode)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (picked !== '') signInAs(picked)
  }

  return (
    <div className="flex min-h-dvh bg-page">
      {/* Brand panel — the approved split-screen direction: deep teal field,
          big white headline, lockup, small © line. Full height, no scroll. */}
      <aside
        aria-hidden
        className="relative hidden w-[46%] flex-col justify-between overflow-hidden text-white lg:flex"
        style={{
          background:
            'linear-gradient(160deg, var(--color-brand-deep) 0%, var(--color-brand) 45%, var(--color-navy-deep) 100%)',
        }}
      >
        <div className="flex items-center gap-3 px-12 pt-10">
          <img src="/emids-icon.png" alt="" width={38} height={38} className="h-9 w-9 object-contain" />
          <p className="text-[15px] font-extrabold tracking-tight">
            EMIDS <span className="font-bold text-white/70">· Rewards and Recognition</span>
          </p>
        </div>

        <div className="px-12 pb-6">
          <h2 className="max-w-[560px] text-4xl font-extrabold leading-[1.15] text-white animate-rise">
            Recognize great work, every day.
          </h2>
          <p className="mt-3 max-w-[520px] text-[15px] font-medium leading-relaxed text-white/80">
            Applause is where teammates celebrate each other&rsquo;s wins — points, recognition and milestones across
            EMIDS.
          </p>
        </div>

        <p className="px-12 pb-8 text-xs text-white/55">© Emids. All rights reserved.</p>
      </aside>

      {/* Sign-in column */}
      <main className="flex min-h-dvh flex-1 items-center justify-center px-6">
        <div className="w-full max-w-[380px]">
          <h1 className="text-[22px] font-extrabold tracking-tight text-navy">Sign in</h1>
          <p className="mt-1 text-[13px] text-muted">Applause portal — EMIDS Rewards and Recognition</p>

          <form onSubmit={onSubmit} className="mt-6">
            <button
              type="button"
              onClick={() => window.location.assign('/api/auth/sso/redirect')}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-[14px] font-bold text-white shadow-card transition hover:bg-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              <LogIn size={16} aria-hidden />
              Continue with Emids SSO
            </button>

            <div className="my-5 flex items-center gap-3 text-[11px] font-extrabold font-mono uppercase tracking-[0.18em] text-muted">
              <span className="h-px flex-1 bg-line" />
              or pick a demo identity
              <span className="h-px flex-1 bg-line" />
            </div>

            <label htmlFor="demo-user" className="block text-[13px] font-bold text-ink">
              Sign in as
            </label>
            <div className="relative mt-1.5">
              <select
                id="demo-user"
                value={picked}
                onChange={(e) => onChange(e.target.value)}
                disabled={users.isLoading || users.error !== undefined}
                className="w-full appearance-none rounded-xl border border-line bg-white px-3.5 py-2.5 pr-9 text-[14px] font-semibold text-ink shadow-card transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:bg-slate-50 disabled:text-muted"
              >
                {/* picker anchor: choosing an option signs in immediately */}
                <option value="">{users.isLoading ? 'Loading member directory…' : 'Select a person'}</option>
                {USER_GROUPS.map(
                  (group) =>
                    usersByGroup(group.persona).length > 0 && (
                      <optgroup key={group.label} label={group.label}>
                        {usersByGroup(group.persona).map((u) => (
                          <option key={u.employee_code} value={u.employee_code}>
                            {u.full_name}
                            {u.title ? ` — ${u.title}` : ''}
                          </option>
                        ))}
                      </optgroup>
                    ),
                )}
              </select>
              <ChevronDown
                size={16}
                aria-hidden
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
              />
            </div>

            {users.error && (
              <div
                role="alert"
                className="mt-3 rounded-xl border border-line bg-coral-soft px-3.5 py-2.5 text-[13px] text-coral"
              >
                Can&rsquo;t reach the portal backend — the directory isn&rsquo;t loading.
                <button
                  type="button"
                  onClick={() => setRetryN((n) => n + 1)}
                  className="ml-1 font-bold underline decoration-2 underline-offset-2"
                >
                  Retry
                </button>
              </div>
            )}

            <p className="mt-4 text-[12px] leading-relaxed text-muted">
              Selecting a person signs you in as them — their page, their data, straight from the portal database.
            </p>
          </form>
        </div>
      </main>
    </div>
  )
}

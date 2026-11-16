import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogIn } from 'lucide-react'
import { getDemoUsers } from '@/lib/data-api'
import { selectDemoUser } from '@/lib/demo-auth'
import { usePageData } from '@/hooks/use-page-data'
import { usePageTitle } from '@/hooks/use-page-title'

const RISE = {
  animation: 'rise 0.65s cubic-bezier(0.22, 0.8, 0.36, 1) both',
}
const STAGGER = [
  { animationDelay: '0.05s' },
  { animationDelay: '0.18s' },
  { animationDelay: '0.3s' },
  { animationDelay: '0.42s' },
]

/**
 * Local sign-in, styled after the Excellence Program POC: a floating rounded
 * brand panel (deep-teal field with radial glows and a slow breathing wash)
 * carries the headline; the right column keeps the SSO promise and signs the
 * demo identity in. The dropdown replaces the POC's email/password block —
 * selecting a person signs AS them and their actor-scoped calls resolve from
 * then on.
 */
export default function LoginPage() {
  usePageTitle('Sign in')
  const navigate = useNavigate()
  // retryN bumps as a dep so a failed load can simply re-run the fetch
  const [retryN, setRetryN] = useState(0)
  const users = usePageData(getDemoUsers, [retryN])
  const [ssoTouched, setSsoTouched] = useState(false)
  const [picked, setPicked] = useState('')

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
    <div className="flex min-h-dvh gap-1 bg-page lg:p-3">
      {/* Brand panel — the Excellence POC field, floating on the page surface */}
      <aside
        aria-hidden
        className="relative hidden w-1/2 min-w-0 flex-none flex-col justify-between overflow-hidden rounded-[28px] px-[clamp(26px,4vw,56px)] py-[clamp(22px,4.5vh,44px)] text-white shadow-[0_18px_44px_rgba(12,84,70,0.16)] lg:flex"
        style={{
          background: [
            'radial-gradient(560px 440px at 88% 2%, rgba(252,211,77,0.10), transparent 62%)',
            'radial-gradient(320px 260px at 84% 10%, rgba(240,180,84,0.07), transparent 60%)',
            'radial-gradient(900px 680px at 14% 84%, rgba(45,212,168,0.16), transparent 60%)',
            'radial-gradient(640px 520px at 52% 40%, rgba(20,184,166,0.08), transparent 65%)',
            'linear-gradient(135deg, #0a3029 0%, #0d4a41 52%, #10756a 100%)',
          ].join(', '),
        }}
      >
        <div
          aria-hidden
          className="login-breathe pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(640px at 22% 74%, rgba(94,234,212,0.10), transparent 70%)' }}
        />

        <div className="relative flex items-center gap-2.5" style={{ ...RISE, ...STAGGER[0] }}>
          <img src="/emids-logo-dark.svg" alt="" className="h-8 w-auto" />
          <span className="block h-2.5 w-2.5 -rotate-45 rounded-[3px] bg-[#34d399]" aria-hidden />
          <span className="whitespace-nowrap text-[12px] font-semibold uppercase tracking-[0.09em] text-[#d6f4ec]/85">
            Excellence Program
          </span>
        </div>

        <div className="relative max-w-[520px] py-8">
          <h1
            className="max-w-[560px] text-[clamp(30px,2.2vw+14px,44px)] font-bold leading-[1.12] tracking-[-0.025em] text-[#f2fbf8]"
            style={{ ...RISE, ...STAGGER[1] }}
          >
            Recognize{' '}
            <span className="bg-gradient-to-r from-teal-200 to-green-200 bg-clip-text text-transparent">
              great work
            </span>{' '}
            every day.
          </h1>
          <p
            className="mt-[18px] max-w-[44ch] text-base leading-relaxed text-[#def6f0]/80"
            style={{ ...RISE, ...STAGGER[2] }}
          >
            Celebrate a teammate&rsquo;s win, spotlight excellence and redeem rewards — all in one place.
          </p>
        </div>

        <p className="relative text-xs text-white/55" style={{ ...RISE, ...STAGGER[3] }}>
          &copy; Emids
        </p>
      </aside>

      {/* Sign-in column — identical logic to the demo user flow */}
      <main className="flex min-h-dvh min-w-0 flex-1 items-center justify-center px-6">
        <div className="w-full max-w-[360px]">
          <h1 className="text-xl font-semibold leading-[1.3] tracking-tight text-ink">Sign in</h1>
          <p className="mt-1.5 text-[13.5px] text-muted">Sign in with your Emids work account.</p>

          <button
            type="button"
            onClick={() => setSsoTouched(true)}
            style={{ ...RISE, ...STAGGER[2] }}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-[10px] bg-brand px-4 py-3 text-[15px] font-medium text-white transition hover:-translate-y-px hover:bg-brand-deep hover:shadow-[0_6px_16px_rgba(13,148,136,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            <LogIn size={16} aria-hidden />
            Continue with Emids SSO
          </button>
          {ssoTouched && (
            <p
              role="status"
              className="mt-2.5 rounded-[10px] border border-line bg-gold-soft px-3.5 py-2 text-[12px] leading-relaxed text-gold-ink"
            >
              Entra SSO lands with the production rollout — for today&rsquo;s demo, pick a demo identity below.
            </p>
          )}

          <div className="my-4 flex items-center gap-2.5 text-xs text-[#8fa3a0]" style={{ ...RISE, ...STAGGER[3] }}>
            <span className="h-px flex-1 bg-[#dfe7e4]" />
            or pick a demo identity
            <span className="h-px flex-1 bg-[#dfe7e4]" />
          </div>

          <form onSubmit={onSubmit} style={{ ...RISE, ...STAGGER[3] }}>
            <label htmlFor="demo-user" className="mb-1.5 block text-[12.5px] font-medium text-[#44605a]">
              Sign in as
            </label>
            <div className="relative">
              <select
                id="demo-user"
                value={picked}
                onChange={(e) => onChange(e.target.value)}
                disabled={users.isLoading || users.error !== undefined}
                className="w-full appearance-none rounded-[10px] border border-[#dfe4e2] bg-white px-3.5 py-3 pr-9 text-sm text-ink transition focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15 disabled:bg-slate-50 disabled:text-muted"
              >
                {/* picker anchor: choosing an option signs in immediately */}
                <option value="">{users.isLoading ? 'Loading member directory…' : 'Select a person'}</option>
                {users.data?.map((u) => (
                  <option key={u.employee_code} value={u.employee_code}>
                    {u.full_name}
                    {u.title ? ` — ${u.title}` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                aria-hidden
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af]"
              />
            </div>

            {users.error && (
              <div
                role="alert"
                className="mt-3 rounded-[10px] border border-line bg-coral-soft px-3.5 py-2.5 text-[13px] text-coral"
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

            <button
              type="submit"
              className="mt-4 w-full rounded-[10px] bg-brand px-4 py-3 text-sm font-medium text-white transition hover:-translate-y-px hover:bg-brand-deep hover:shadow-[0_6px_16px_rgba(13,148,136,0.25)] active:translate-y-0 active:bg-[#115e59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Sign in
            </button>
          </form>

          <p className="mt-[18px] text-center text-[13px] text-muted">
            Need help? <span className="font-medium text-brand-deep">Contact IT</span>
          </p>
        </div>
      </main>
    </div>
  )
}

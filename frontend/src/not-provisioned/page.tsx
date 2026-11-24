import { useRef, useState } from 'react'
import { ShieldAlert } from 'lucide-react'

/** The signed-in-but-unprovisioned state (option A, fail-closed): Entra
 *  authenticated the caller, but no users row carries their external_id, so
 *  no portal data is reachable. Shows the verified identity fields and the
 *  pre-filled INSERT the dev needs to provision — fail-open would mean every
 *  tenant user appears as a ghost employee.
 *  Props come from a resolved /api/me Entra session, not request data. */
export interface NotProvisionedIdentity {
  external_id: string | null
  tenant_id: string | null
  email: string
  upn: string
  full_name: string
  job_title: string | null
}

const FIELD_ROWS: Array<{ label: string; get: (i: NotProvisionedIdentity) => string }> = [
  { label: 'Name ( Graph displayName )', get: (i) => i.full_name },
  { label: 'Verified email', get: (i) => i.email },
  { label: 'UPN', get: (i) => i.upn },
  { label: 'external_id  ( Graph id → users.external_id )', get: (i) => i.external_id ?? '(missing from token)' },
  { label: 'Tenant', get: (i) => i.tenant_id ?? '—' },
  { label: 'Job title', get: (i) => i.job_title ?? '—' },
]

const INSERT_SQL = (i: NotProvisionedIdentity) =>
  `INSERT INTO users (employee_code, email, external_id, full_name, title, department, manager_id, joined_on)\n` +
  `VALUES ('E-??', '${i.email}', '${i.external_id ?? ''}', '${i.full_name}',\n` +
  `        '${i.job_title ?? i.full_name}', '<department>',\n` +
  `        (SELECT id FROM users WHERE full_name = '<manager>'), DATE '<y-m-d>');`

/** Not-provisioned screen — identity verified, record missing. */
export default function NotProvisionedPage({ identity }: { identity: NotProvisionedIdentity }) {
  const [copied, setCopied] = useState<false | 'copied' | 'selected'>(false)
  const sqlRef = useRef<HTMLPreElement>(null)

  const copyInsert = () => {
    const sql = INSERT_SQL(identity)
    const select = () => {
      const pre = sqlRef.current
      if (!pre) return false
      const range = document.createRange()
      range.selectNodeContents(pre)
      const selection = document.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
      return document.getSelection()?.toString() === sql
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(sql).then(() => setCopied('copied'), () => setCopied(select() ? 'selected' : false))
      return
    }
    setCopied(select() ? 'selected' : false)
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-[#f6f8fc] px-4">
      <div className="w-full max-w-[620px] rounded-2xl border border-[#e3e9f2] bg-white p-8 shadow-card">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff4de] text-[#8a5a00]">
          <ShieldAlert size={20} aria-hidden />
        </span>
        <h1 className="mt-4 text-[20px] font-extrabold tracking-tight text-[#0b2a4a]">
          Your EMIDS profile isn&rsquo;t on the portal yet
        </h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#55697d]">
          You signed in successfully with Entra ID as the account below — but no portal account maps to it, so Applause
          is not reachable yet. Ask the portal admins to provision your profile, or, if you&rsquo;re the onboarding dev,
          add the row with the details here.
        </p>

        <div className="mt-5 overflow-hidden rounded-xl border border-[#e3e9f2]">
          <table className="w-full text-left text-[13px]">
            <tbody>
              {FIELD_ROWS.map((row) => (
                <tr key={row.label} className="border-b border-[#eef3f7] last:border-0">
                  <td className="px-4 py-2.5 font-semibold text-[#55697d]">{row.label}</td>
                  <td className="tnum px-4 py-2.5 font-medium text-[#16324f]">{row.get(identity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-xl border border-[#e3e9f2] bg-[#f8fafc] p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11.5px] font-extrabold font-mono uppercase tracking-[0.12em] text-[#55697d]">
              Provision — insert ( fill the ? fields )
            </p>
            <button
              type="button"
              onClick={copyInsert}
              className="rounded-lg bg-[#153B5A] px-3 py-1.5 text-[12px] font-bold text-white transition hover:brightness-110"
            >
              {copied === 'copied' ? 'Copied ✓' : copied === 'selected' ? 'Selected — press Ctrl+C' : 'Copy SQL'}
            </button>
          </div>
          <pre ref={sqlRef} className="mt-2.5 overflow-x-auto text-[11.5px] leading-relaxed text-[#16324f]">
            {INSERT_SQL(identity)}
          </pre>
        </div>

        <p className="mt-4 text-[12.5px] leading-relaxed text-[#55697d]">
          Once the row exists, refresh this page — the identity lookup is live, so you&rsquo;ll land on the dashboard
          right away without signing in again.
        </p>
      </div>
    </div>
  )
}

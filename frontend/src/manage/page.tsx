import { Link } from 'react-router-dom'
import { ClipboardList, Users } from 'lucide-react'
import { getPeopleDirectory, type DirectoryPerson } from '@/lib/data-api'
import { usePageData } from '@/hooks/use-page-data'
import { usePageTitle } from '@/hooks/use-page-title'
import { ErrorState, LoadingSkeleton } from '../load-ui'

/** Manage — the admin's working screen: the approvals queue to tend and the
 *  people directory to look up, over the same card language as the portal. */
export default function ManagePage() {
  usePageTitle('Manage')
  const { data: people, error, isLoading } = usePageData(getPeopleDirectory, [])

  if (isLoading) return <LoadingSkeleton label="Loading the directory…" />
  if (error) return <ErrorState error={error} />
  if (!people) return null

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 pt-1 pb-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-[#0b2a4a]">Manage</h1>
          <p className="mt-0.5 text-[13.5px] text-[#55697d]">
            Approval queue and the people directory, in one place.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/approvals"
          className="group flex items-center gap-4 rounded-2xl border border-[#e3ebf2] bg-white p-5 transition hover:border-[#f5b324]"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fdf5e3] text-[#b8860b]">
            <ClipboardList size={20} aria-hidden />
          </span>
          <span>
            <span className="block text-[15px] font-bold text-[#0b2a4a]">Approvals queue</span>
            <span className="block text-[13px] text-[#55697d]">Point recognitions waiting on a decision</span>
          </span>
        </Link>
        <div className="flex items-center gap-4 rounded-2xl border border-[#e3ebf2] bg-white p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e6f6f4] text-[#0b6e68]">
            <Users size={20} aria-hidden />
          </span>
          <span>
            <span className="block text-[15px] font-bold text-[#0b2a4a]">
              Directory · {people.length} people
            </span>
            <span className="block text-[13px] text-[#55697d]">Recognizable employees and their managers</span>
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#e3ebf2] bg-white">
        <table className="w-full text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-[#e3ebf2] bg-[#f8fafc] text-[11.5px] uppercase tracking-[0.08em] text-[#55697d]">
              <th className="px-5 py-3 font-bold">Name</th>
              <th className="px-5 py-3 font-bold">Code</th>
              <th className="px-5 py-3 font-bold">Department</th>
              <th className="px-5 py-3 font-bold">Title</th>
              <th className="px-5 py-3 font-bold">Manager</th>
            </tr>
          </thead>
          <tbody>
            {people.map((row: DirectoryPerson) => (
              <tr key={row.id} className="border-b border-[#eef3f7] last:border-0">
                <td className="px-5 py-2.5 font-semibold text-[#0b2a4a]">{row.full_name}</td>
                <td className="px-5 py-2.5 text-[#55697d]">{row.employee_code}</td>
                <td className="px-5 py-2.5 text-[#55697d]">{row.department ?? '—'}</td>
                <td className="px-5 py-2.5 text-[#55697d]">{row.title ?? '—'}</td>
                <td className="px-5 py-2.5 text-[#55697d]">{row.manager_name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

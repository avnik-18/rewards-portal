import { Link } from 'react-router-dom'

/** The shared "page doesn't exist" block — used by the route table and by profile. */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-20 text-center">
      <h1 className="text-2xl font-extrabold tracking-tight text-navy">This page doesn't exist</h1>
      <p className="mt-1 text-[15px] text-muted">Check the link, or go back to the dashboard.</p>
      <Link to="/" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
        Go to dashboard
      </Link>
    </div>
  )
}

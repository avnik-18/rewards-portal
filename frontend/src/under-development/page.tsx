import { usePageTitle } from '@/hooks/use-page-title'

/** Transitional holding page for the lanes not spun up yet (My Rewards,
 *  Recognition history) — honest state, no fake data. */
export default function UnderDevelopmentPage({ title, what }: { title: string; what: string }) {
  usePageTitle(title)

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 px-4 pt-1 pb-6 lg:px-8">
      <div className="rounded-2xl border border-[#e3ebf2] bg-white px-6 py-16 text-center">
        <span
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fdf5e3] text-2xl"
          aria-hidden
        >
          🚧
        </span>
        <h1 className="mt-4 text-[20px] font-extrabold text-[#0b2a4a]">{title} is under development</h1>
        <p className="mx-auto mt-2 max-w-[440px] text-[13.5px] leading-relaxed text-[#55697d]">
          {what} is being built right now — this lane will light up as soon as it ships. Everything else keeps working
          like today.
        </p>
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'

/** Navy quarterly-awards call-out — the right rail's closing card. */
export default function AwardsCard() {
  return (
    <div className="rounded-2xl bg-[#141f3a] p-5 text-white">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-[#f5b324] uppercase">Quarterly awards</p>
      <p className="my-2 text-[20px] font-bold leading-[1.3]">
        Awards worth <span className="text-[#f5b324]">7,500 pts</span> this quarter
      </p>
      <p className="mb-4 text-[13px] leading-[1.5] text-[#b8c3d9]">
        Nominate the teammate who shipped, saved, and showed up.
      </p>
      <Link
        to="/recognize"
        className="flex h-11 items-center justify-center rounded-xl bg-[#f5b324] px-5 text-sm font-bold text-[#2a1c00] transition hover:brightness-110"
      >
        Nominate someone
      </Link>
    </div>
  )
}

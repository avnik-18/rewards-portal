import { Trophy } from 'lucide-react'
import { Card } from '@/components/atoms'
import type { EoQAward } from '@/lib/mock-data'

export interface MyEoQAwardsProps {
  awards: EoQAward[]
}

export default function MyEoQAwards({ awards }: MyEoQAwardsProps) {
  return (
    <div>
      <h2 className="mb-3 text-xl font-extrabold tracking-tight text-navy">My EoQ awards</h2>
      <div className="space-y-2.5">
        {awards.map((award) => (
          <Card key={award.id} className="flex items-center gap-3.5 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold-ink">
              <Trophy size={17} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-extrabold text-navy">{award.category}</p>
              <p className="truncate text-[12px] text-muted">nominated {award.nominee} · jury pipeline</p>
            </div>
            {award.status === 'result' ? (
              <span className="tnum shrink-0 rounded-full bg-gold px-3 py-1 text-[11.5px] font-extrabold text-[#3d2b00]">
                {award.result}
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1 text-[11.5px] font-extrabold text-brand-deep">
                In review
              </span>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

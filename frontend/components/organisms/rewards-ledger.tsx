import { Trophy } from 'lucide-react'
import { Card } from '@/components/atoms'
import LedgerItem from '@/components/molecules/LedgerItem'
import type { LedgerEntry } from '@/lib/mock-data'

export interface RewardsLedgerProps {
  entries: LedgerEntry[]
}

/** Full points ledger, reads top to bottom, newest first. */
export function RewardsLedger({ entries }: RewardsLedgerProps) {
  return (
    <section id="ledger" className="mt-8 scroll-mt-24">
      <div className="mb-3">
        <h2 className="text-xl font-extrabold tracking-tight text-navy">Points ledger</h2>
      </div>
      <Card className="divide-y divide-line p-0">
        {entries.map((entry) => (
          <LedgerItem key={entry.id} entry={entry} />
        ))}
        {entries.length === 0 && (
          <div className="flex items-center gap-3 px-4 py-8">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-soft text-gold-ink"
              aria-hidden
            >
              <Trophy size={17} />
            </span>
            <p className="text-[13px] text-muted">No ledger entries yet.</p>
          </div>
        )}
      </Card>
    </section>
  )
}

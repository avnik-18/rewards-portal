import { Award, ArrowDownLeft, ArrowUpRight, ShoppingBag } from 'lucide-react'
import type { ReactNode } from 'react'
import { ledgerKindLabel } from '@/lib/rewards'
import { fmtNum } from '@/lib/format'
import type { LedgerEntry } from '@/lib/data-api'

interface KindStyle {
  icon: ReactNode
  tint: string
  color: string
}

const KIND_STYLES: Record<LedgerEntry['kind'], KindStyle> = {
  award: { icon: <Award size={16} />, tint: 'bg-violet-soft', color: 'text-violet-ink' },
  grant: { icon: <ArrowDownLeft size={16} />, tint: 'bg-mint-soft', color: 'text-mint' },
  earning: { icon: <ArrowUpRight size={16} />, tint: 'bg-gold-soft', color: 'text-gold-ink' },
  redemption: { icon: <ShoppingBag size={16} />, tint: 'bg-coral-soft', color: 'text-coral-ink' },
}

export interface LedgerItemProps {
  entry: LedgerEntry
}

/** One ledger row: kind icon, label, date, signed amount. */
export default function LedgerItem({ entry }: LedgerItemProps) {
  const style = KIND_STYLES[entry.kind]
  return (
    <div className="flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-slate-50">
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${style.tint} ${style.color}`}
        aria-hidden
      >
        {style.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-ink">{entry.label}</p>
        <p className="text-[11.5px] text-muted">
          {entry.when} · <span className="capitalize">{ledgerKindLabel(entry.kind)}</span>
        </p>
      </div>
      <p className={`tnum text-[15px] font-extrabold ${entry.amount >= 0 ? 'text-mint' : 'text-coral'}`}>
        {entry.amount >= 0 ? '+' : ''}
        {fmtNum(entry.amount)}
      </p>
    </div>
  )
}

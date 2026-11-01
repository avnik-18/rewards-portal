import type { LedgerEntry } from './mock-data'

/** Net points over the full ledger (credits minus debits). */
export const netPoints = (entries: LedgerEntry[]): number => entries.reduce((sum, e) => sum + e.amount, 0)

/** Entries affecting the wallet, grouped by sign. */
export const splitLedger = (entries: LedgerEntry[]): { credits: LedgerEntry[]; debits: LedgerEntry[] } => ({
  credits: entries.filter((e) => e.amount >= 0),
  debits: entries.filter((e) => e.amount < 0),
})

export const ledgerKindLabel = (kind: LedgerEntry['kind']): string =>
  ({ award: 'Award', grant: 'Grant', earning: 'Peer earning', redemption: 'Redemption' })[kind]

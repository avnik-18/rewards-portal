'use client'

import { useState } from 'react'
import type { ApprovalItem } from '@/lib/mock-data'
import type { ApprovalVerdict } from '@/lib/approval'

/** A decision with its audit note — the note is no longer dropped. */
export interface ApprovalDecision {
  verdict: ApprovalVerdict
  note: string
}

/**
 * Holds decisions for the current session — the approvals list itself is
 * data-layer owned; this hook only tracks what the viewer decided,
 * with which note, and when.
 */
export function useApprovals(items: ApprovalItem[]) {
  const [decided, setDecided] = useState<Record<string, ApprovalDecision>>({})

  const decide = (id: string, verdict: ApprovalVerdict, note = '') => {
    if (!items.some((item) => item.id === id)) return
    setDecided((existing) => ({ ...existing, [id]: { verdict, note } }))
  }

  const decideItem = (item: ApprovalItem, verdict: ApprovalVerdict, note = '') =>
    decide(item.id, verdict, note)

  return { decided, decide, decideItem }
}

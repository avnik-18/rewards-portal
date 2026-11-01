'use client'

import { useState } from 'react'
import type { ApprovalItem } from '@/lib/mock-data'
import type { ApprovalVerdict } from '@/lib/approval'

/**
 * Holds decisions for the current session — the approvals list itself is
 * data-layer owned; this hook only tracks what the viewer decided and when.
 */
export function useApprovals(items: ApprovalItem[]) {
  const [decided, setDecided] = useState<Record<string, ApprovalVerdict>>({})

  const decide = (id: string, verdict: ApprovalVerdict) => {
    if (!items.some((a) => a.id === id)) return
    setDecided((d) => ({ ...d, [id]: verdict }))
  }

  const decideItem = (item: ApprovalItem, verdict: ApprovalVerdict) => decide(item.id, verdict)

  return { decided, decide, decideItem }
}

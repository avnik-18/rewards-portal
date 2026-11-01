'use client'

import { useState } from 'react'
import { GitBranch } from 'lucide-react'
import MyTree from '@/components/organisms/MyTree'
import type { RecognitionTreeData } from '@/lib/data-api'

export interface TeamTreeButtonProps {
  /** Tree data fetched on the server (reports, pts, teams). */
  tree: RecognitionTreeData
}

/** Header trigger for the Recognition Tree overlay, with the open state. */
export default function TeamTreeButton({ tree }: TeamTreeButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-[13.5px] font-bold text-white shadow-[0_1px_2px_rgba(10,31,68,.18)] transition hover:bg-brand-deep"
      >
        <GitBranch size={16} /> Recognition Tree
      </button>
      <MyTree open={open} onClose={() => setOpen(false)} data={tree} />
    </>
  )
}

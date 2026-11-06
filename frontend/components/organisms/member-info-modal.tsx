'use client'

import { Send } from 'lucide-react'
import { Avatar, Btn, Card, Chip, Modal, CloseX } from '@/components/atoms'
import { CORE_VALUES, type ValueKey } from '@/lib/data-api'
import { person } from '@/lib/data-api'
import type { TeamRow } from '@/lib/data-api'

interface MemberInfoModalProps {
  /** Row behind the modal — null closes it (open flag = row presence). */
  viewRow: TeamRow | null
  onClose: () => void
  onOpenProfile: (id: string) => void
  onPraise: (id: string) => void
}

/** "View info" detail for one team member — quarter stats + primary value. */
export default function MemberInfoModal({ viewRow, onClose, onOpenProfile, onPraise }: MemberInfoModalProps) {
  const viewPerson = viewRow ? person(viewRow.id) ?? null : null
  const viewValue = viewRow ? CORE_VALUES[viewRow.valuesTop as ValueKey] : null
  return (
    <Modal open={!!viewRow} onClose={onClose} label="Team member info">
      {viewRow && viewPerson ? (
        <div className="p-6">
          <CloseX onClick={onClose} />
          <div className="flex items-center gap-4">
            <Avatar id={viewRow.id} size={62} />
            <div className="min-w-0">
              <p className="text-[19px] font-extrabold tracking-tight text-navy">{viewPerson.name}</p>
              <p className="text-[13.5px] text-muted">
                {viewPerson.title} · {viewPerson.office}
              </p>
              {viewValue && <Chip className={`mt-1.5 ${viewValue.soft} ${viewValue.ink}`}>{viewValue.label}</Chip>}
            </div>
          </div>
          <p className="mb-1.5 mt-6 text-[10.5px] font-extrabold font-mono uppercase tracking-[0.14em] text-muted">
            This quarter
          </p>
          <Card className="grid grid-cols-2 divide-x divide-line">
            <div className="px-4 py-3.5">
              <p className="tnum text-[22px] font-extrabold text-navy">{viewRow.received}</p>
              <p className="mt-0.5 text-[10.5px] font-bold font-mono uppercase tracking-wide text-muted">
                Recognitions received
              </p>
            </div>
            <div className="px-4 py-3.5">
              <p className="tnum text-[22px] font-extrabold text-navy">{viewRow.given}</p>
              <p className="mt-0.5 text-[10.5px] font-bold font-mono uppercase tracking-wide text-muted">
                Recognitions given
              </p>
            </div>
          </Card>
          <div className="mt-3 space-y-2.5 rounded-2xl border border-line bg-slate-50 px-4 py-3.5">
            <p className="flex items-center justify-between text-[13px]">
              <span className="font-semibold text-muted">Last recognition</span>
              <span className="tnum font-extrabold text-navy">{viewRow.lastRecognized}</span>
            </p>
            <p className="flex items-center justify-between text-[13px]">
              <span className="font-semibold text-muted">Primary value</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${viewValue?.soft} ${viewValue?.ink}`}>
                {viewValue?.label}
              </span>
            </p>
            <p className="flex items-center justify-between text-[13px]">
              <span className="font-semibold text-muted">Office</span>
              <span className="font-extrabold text-navy">{viewPerson.office}</span>
            </p>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Btn
              variant="ghost"
              onClick={() => {
                onClose()
                onOpenProfile(viewRow.id)
              }}
            >
              Full profile
            </Btn>
            <Btn variant="primary" onClick={() => onPraise(viewRow.id)}>
              <Send size={14} /> Recognize
            </Btn>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}

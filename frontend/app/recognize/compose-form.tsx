'use client'

import { useEffect } from 'react'
import ComposeHeading from './compose-heading'
import CcRecipientField from './cc-recipient-field'
import MessageField from './message-field'
import PointsPicker from './points-picker'
import PreviewColumn, { ExpandedPreviewModal } from './preview-column'
import ToRecipientField from './to-recipient-field'
import ValuePicker from './value-picker'
import type { ComposeFormApi } from '@/hooks/use-compose-form'
import { useComposeForm } from '@/hooks/use-compose-form'
import type { Person } from '@/lib/data-api'

export interface ComposeFormProps {
  /** Recognizable teammates, sorted by name. */
  people: Person[]
  /** Recipient preset from /recognize?to=<id> — Praise/Recognize buttons use it. */
  initialToId?: string
}

/** The composer shell: heading + the six single-purpose sections + grid. */
export function ComposeForm({ people, initialToId }: ComposeFormProps) {
  const form: ComposeFormApi = useComposeForm(people)

  // Preset recipient once (Praise buttons land here with ?to=<id>) — but only
  // when the id exists in the directory, sir's review said validate before
  // preselecting (garbage ?to= must not create a ghost recipient chip)
  useEffect(() => {
    // sir's review: validate the preset against the directory — but keep the UI
    // silent when the link is stale (the picker below invites a fresh pick)
    if (initialToId && people.some((candidate) => candidate.id === initialToId)) form.addToSel(initialToId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sendDisabled = !form.canSend || form.isBusy() || form.status === 'sent'

  return (
    <div className="flex flex-col">
      <ComposeHeading />

      <div className="mx-auto grid w-full max-w-6xl gap-x-6 gap-y-5 px-5 py-4 lg:grid-cols-[1fr_1.4fr]">
        {/* Left: compose column */}
        <div>
          <ToRecipientField form={form} />
          <CcRecipientField form={form} />
          <ValuePicker form={form} />
          <MessageField form={form} />
          <PointsPicker form={form} />
        </div>

        {/* Right: templates + preview */}
        <PreviewColumn form={form} sendDisabled={sendDisabled} />
      </div>

      <ExpandedPreviewModal form={form} />
      <p aria-live="polite" className="sr-only">
        {form.status === 'sent' ? 'sent' : form.status}
      </p>
    </div>
  )
}

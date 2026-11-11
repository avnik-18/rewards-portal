import { useState } from 'react'
import { activeTemplateFor, prefillUpdate, AI_DRAFTS, POINT_PRESETS, personLabel } from '@/lib/compose'
import { CORE_VALUES, VALUE_TEMPLATES, type ValueKey } from '@/lib/data-api'
import { useRecipients, type ComposePerson } from './use-recipients'
import { useSendRecognition } from './use-send-recognition'

export type { ComposePerson }

/**
 * Composes the two single-purpose hooks — recipient picking plus the send
 * lifecycle — with the shared creative state (value chip, note, points, AI
 * helpers). The returned shape IS ComposeFormApi; every field component reads
 * the same object as before, so the split stays invisible to them.
 */
export function useComposeForm(people: ComposePerson[], initialToId?: string) {
  const recipients = useRecipients(people, initialToId)
  const { toSel, labels } = recipients
  const [valueKey, setValueKey] = useState<ValueKey | null>(null)
  const [tplId, setTplId] = useState<string | null>(null)
  const [variantIdx, setVariantIdx] = useState(0)
  const [message, setMessage] = useState('')
  const [points, setPoints] = useState(0)
  const [aiBusy, setAiBusy] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const canSend = toSel.length > 0 && !!valueKey && message.trim().length > 8
  const activeTpl = activeTemplateFor(valueKey, tplId)
  const previewValue = valueKey ? CORE_VALUES[valueKey] : null

  const sender = useSendRecognition({
    toIds: toSel,
    ccIds: recipients.ccSel,
    valueKey,
    message,
    points,
    tplId,
    artUrl: () => (activeTpl ? (activeTpl.urls[variantIdx] ?? activeTpl.urls[0]) : undefined),
  })

  /** Swap the value-prefill sentence in the note when the chosen value changes. */
  function chooseValue(chosenValueKey: ValueKey) {
    const template = VALUE_TEMPLATES[chosenValueKey]?.[0] ?? null
    const prev = activeTemplateFor(valueKey, tplId)
    setTplId(template?.id ?? null)
    setValueKey(chosenValueKey)
    setVariantIdx(0)
    const firstName = toSel[0] ? personLabel(toSel[0], labels) : null
    setMessage((currentMessage) =>
      prefillUpdate({ message: currentMessage, prevTemplate: prev, nextTemplate: template, firstName }),
    )
  }

  async function aiDraft() {
    if (!toSel.length) return
    setAiBusy(true)
    const names = toSel.map((id) => personLabel(id, labels)).join(' and ')
    const valueChosen = valueKey ?? 'ownership'
    setMessage(`${names} ${AI_DRAFTS[valueChosen]} Keep it in your own words if you can.`)
    setTimeout(() => setAiBusy(false), 800)
  }

  function aiPolish() {
    if (message.trim().length < 10) return
    setAiBusy(true)
    setTimeout(() => {
      setMessage((currentMessage) =>
        currentMessage
          .trim()
          .replace(/\s+/g, ' ')
          .replace(/\.?$/, '. This made a real difference — thank you for setting the standard.'),
      )
      setAiBusy(false)
    }, 650)
  }

  return {
    ...recipients,
    ...sender,
    valueKey,
    tplId,
    variantIdx,
    setVariantIdx,
    message,
    setMessage,
    points,
    setPoints,
    chooseValue,
    aiBusy,
    aiDraft,
    aiPolish,
    expanded,
    setExpanded,
    canSend,
    activeTpl,
    previewValue,
    POINT_PRESETS,
  }
}

export type ComposeFormApi = ReturnType<typeof useComposeForm>

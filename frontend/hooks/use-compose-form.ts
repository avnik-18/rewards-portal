'use client'

import { useMemo, useState } from 'react'
import { sendRecognition, type CreatedRecognition } from '@/lib/data-api'
import { validateRecognition, hasErrors, type FieldErrors } from '@/lib/validate'
import { activeTemplateFor, personLabel, prefillUpdate, EMAIL_RE, AI_DRAFTS, POINT_PRESETS } from '@/lib/compose'
import { CORE_VALUES, VALUE_TEMPLATES, person, type ValueKey } from '@/lib/mock-data'

let emailSeq = 0
const nextEmailId = () => `email-${Date.now()}-${++emailSeq}`

interface ComposePerson {
  id: string
  name: string
  title: string
  email: string
  managerId?: string
}

/**
 * Owns every bit of Compose state — recipients (To + CC), value chip, note,
 * template variant, points, draft/polish and the send lifecycle.
 */
export function useComposeForm(people: ComposePerson[]) {
  const [toSel, setToSel] = useState<string[]>([])
  const [ccSel, setCcSel] = useState<string[]>([])
  const [labels, setLabels] = useState<Record<string, string>>({}) // typed email keyed by generated id
  const [q, setQ] = useState('')
  const [ccq, setCcq] = useState('')
  const [valueKey, setValueKey] = useState<ValueKey | null>(null)
  const [tplId, setTplId] = useState<string | null>(null)
  const [variantIdx, setVariantIdx] = useState(0)
  const [message, setMessage] = useState('')
  const [points, setPoints] = useState(0)
  const [aiBusy, setAiBusy] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [created, setCreated] = useState<CreatedRecognition | null>(null)

  const isBusy = () => status === 'sending'
  const canSend = toSel.length > 0 && !!valueKey && message.trim().length > 8
  const activeTpl = activeTemplateFor(valueKey, tplId)
  const previewValue = valueKey ? CORE_VALUES[valueKey] : null
  const recipients = toSel.map((id) => ({ id, label: personLabel(id, labels) }))
  const ccManagers = useMemo(
    () => [...new Set(toSel.map((id) => person(id).managerId).filter(Boolean))] as string[],
    [toSel],
  )

  function pickResults(query: string): ComposePerson[] {
    const s = query.trim().toLowerCase()
    if (!s) return []
    return people
      .filter(
        (p) =>
          !toSel.includes(p.id) &&
          !ccSel.includes(p.id) &&
          (p.name.toLowerCase().includes(s) || p.title.toLowerCase().includes(s) || p.email.toLowerCase().includes(s)),
      )
      .slice(0, 6)
  }

  function emailCandidate(query: string): string | null {
    const value = query.trim().toLowerCase()
    return EMAIL_RE.test(value) && !people.some((p) => p.email === value) ? value : null
  }

  function addToSel(id: string) {
    // Guard inside the updater: StrictMode double-invokes effects, and a closure
    // check would run twice against stale state and add the same id twice.
    let added = false
    setToSel((sel) => {
      if (sel.includes(id)) return sel
      added = true
      return [...sel, id]
    })
    return added
  }

  function addToCcSel(id: string) {
    if (ccSel.includes(id) || toSel.includes(id)) return false
    setCcSel((sel) => [...sel, id])
    return true
  }

  function removeFromToSel(id: string) {
    setToSel((sel) => sel.filter((x) => x !== id))
  }

  function removeFromCcSel(id: string) {
    setCcSel((sel) => sel.filter((x) => x !== id))
  }

  function addEmailToTo(email: string, id = nextEmailId()) {
    setLabels((l) => ({ ...l, [id]: email }))
    setToSel((sel) => [...sel, id])
  }

  function addEmailToCc(email: string, id = nextEmailId()) {
    setLabels((l) => ({ ...l, [id]: email }))
    setCcSel((sel) => [...sel, id])
  }

  function chooseValue(k: ValueKey) {
    const t = VALUE_TEMPLATES[k]?.[0] ?? null
    const prev = activeTemplateFor(valueKey, tplId)
    setTplId(t?.id ?? null)
    setValueKey(k)
    setVariantIdx(0)
    const first = toSel[0] ? personLabel(toSel[0], labels) : null
    setMessage((m) => prefillUpdate({ message: m, prevTemplate: prev, nextTemplate: t, firstName: first }))
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
      setMessage((m) =>
        m
          .trim()
          .replace(/\s+/g, ' ')
          .replace(/\.?$/, '. This made a real difference — thank you for setting the standard.'),
      )
      setAiBusy(false)
    }, 650)
  }

  async function submit(): Promise<boolean> {
    console.debug('[compose-bebug] submit called', { toSel, valueKey, msgLen: message.trim().length, points })
    if (!toSel.length) {
      setErrors({ ...errors, toIds: 'Pick a teammate to recognize.' })
      return false
    }
    const errs = validateRecognition({ toIds: toSel, valueKey, message, points })
    setErrors(errs)
    if (hasErrors(errs)) return false
    setStatus('sending')
    const url = activeTpl ? (activeTpl.urls[variantIdx] ?? activeTpl.urls[0]) : undefined
    try {
      const createdRel = await sendRecognition({
        toIds: toSel,
        ccIds: ccSel,
        valueKey: valueKey!,
        message: message.trim(),
        points,
        artUrl: url,
        tplId: tplId ?? undefined,
      })
      console.debug('[compose-bebug] send ok', createdRel.id)
      setCreated(createdRel)
      setStatus('sent')
      return true
    } catch (e) {
      console.debug('[compose-bebug] send failed', e)
      throw e
    }
  }

  return {
    toSel,
    ccSel,
    ccManagers,
    labels,
    q,
    setQ,
    ccq,
    setCcq,
    valueKey,
    tplId,
    variantIdx,
    setVariantIdx,
    message,
    setMessage,
    points,
    setPoints,
    pickResults,
    emailCandidate,
    addToSel,
    addToCcSel,
    removeFromToSel,
    removeFromCcSel,
    addEmailToTo,
    addEmailToCc,
    chooseValue,
    aiBusy,
    aiDraft,
    aiPolish,
    expanded,
    setExpanded,
    canSend,
    activeTpl,
    previewValue,
    recipients,
    errors,
    status,
    created,
    submit,
    isBusy,
    POINT_PRESETS,
  }
}

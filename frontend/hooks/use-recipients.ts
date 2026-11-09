import { useMemo, useState } from 'react'
import { personLabel, EMAIL_RE } from '@/lib/compose'
import { person } from '@/lib/data-api'

/** A directory row the composer can search and pick from. */
export interface ComposePerson {
  id: string
  name: string
  title: string
  email: string
  managerId?: string
}

let emailSeq = 0
const nextEmailId = () => `email-${Date.now()}-${++emailSeq}`

/**
 * Recipient half of the composer: the To/CC selection, typed-email labels,
 * both search queries, directory match results and the auto-collected managers.
 */
export function useRecipients(people: ComposePerson[]) {
  const [toSel, setToSel] = useState<string[]>([])
  const [ccSel, setCcSel] = useState<string[]>([])
  const [labels, setLabels] = useState<Record<string, string>>({}) // typed email keyed by generated id
  const [q, setQ] = useState('')
  const [ccq, setCcq] = useState('')

  const ccManagers = useMemo(
    () => [...new Set(toSel.map((id) => person(id)?.managerId).filter(Boolean))] as string[],
    [toSel],
  )

  const recipients = toSel.map((id) => ({ id, label: personLabel(id, labels) }))

  function pickResults(query: string): ComposePerson[] {
    const needle = query.trim().toLowerCase()
    if (!needle) return []
    return people
      .filter(
        (candidate) =>
          !toSel.includes(candidate.id) &&
          !ccSel.includes(candidate.id) &&
          (candidate.name.toLowerCase().includes(needle) ||
            candidate.title.toLowerCase().includes(needle) ||
            candidate.email.toLowerCase().includes(needle)),
      )
      .slice(0, 6)
  }

  function emailCandidate(query: string): string | null {
    const value = query.trim().toLowerCase()
    return EMAIL_RE.test(value) && !people.some((attached) => attached.email === value) ? value : null
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
    setToSel((selected) => selected.filter((candidate) => candidate !== id))
  }

  function removeFromCcSel(id: string) {
    setCcSel((selected) => selected.filter((candidate) => candidate !== id))
  }

  function addEmailToTo(email: string, id = nextEmailId()) {
    setLabels((current) => ({ ...current, [id]: email }))
    setToSel((sel) => [...sel, id])
  }

  function addEmailToCc(email: string, id = nextEmailId()) {
    setLabels((current) => ({ ...current, [id]: email }))
    setCcSel((sel) => [...sel, id])
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
    recipients,
    pickResults,
    emailCandidate,
    addToSel,
    addToCcSel,
    removeFromToSel,
    removeFromCcSel,
    addEmailToTo,
    addEmailToCc,
  }
}

export type RecipientsApi = ReturnType<typeof useRecipients>

import { VALUE_TEMPLATES, person, type PraiseTemplate, type ValueKey } from './mock-data'

/** Who you might be recognizing — rolls through vertically in the composer heading. */
export const ROTATE_WORDS = ['teammate', 'colleague', 'team lead', 'manager', 'peer']

export const POINT_PRESETS = [0, 25, 50, 100]

/** ReDoS-safe email check: the domain labels and their dot separators are
 *  disjoint runs, so backtracking stays linear (no nested quantifiers —
 *  sir's review on the old "one class eats the dots" pattern). */
export const EMAIL_RE = /^[^\s@]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/

/** First draft text per value — the "Draft for me" button fills the note with it. */
export const AI_DRAFTS: Record<ValueKey, string> = {
  customerFirst:
    'went above and beyond for the client this week — the turnaround on their urgent request was seamless, and the client team specifically called it out in the QBR thread.',
  innovation:
    'found a cleaner way to solve a problem we had all stopped questioning. The new approach cut manual effort substantially and is already being picked up by other pods.',
  collaboration:
    'stepped in across team boundaries without hesitation — unblocked two other squads this week and shared the context so it stuck.',
  ownership:
    'took the hard ticket nobody wanted and drove it end-to-end: root cause, fix, and a repro test so it never comes back.',
  winningMindset:
    'brought real momentum at the most critical moment of the sprint — late nights, calm head, and a shipped result to show for it.',
}

/** First-name label for a chip, or the typed email when that is what was added. */
export const personLabel = (id: string, labels: Record<string, string>): string => {
  const typed = labels[id]
  if (typed && EMAIL_RE.test(typed.trim())) return typed.toLowerCase()
  // the id was validated against the directory before reaching a chip
  return person(id)?.name.split(' ')[0] ?? id
}

/** Swap the value-prefill sentence in the note when the chosen value changes. */
export function prefillUpdate(args: {
  message: string
  prevTemplate: PraiseTemplate | null
  nextTemplate: PraiseTemplate | null
  firstName: string | null
}): string {
  const { message, prevTemplate, nextTemplate, firstName } = args
  if (prevTemplate?.prefill && message.trimEnd().endsWith(prevTemplate.prefill)) {
    const prefix = message.slice(0, message.length - prevTemplate.prefill.length)
    return nextTemplate ? prefix + nextTemplate.prefill : message
  }
  if (nextTemplate && !message.trim())
    return firstName ? `${firstName} — ${nextTemplate.prefill}` : nextTemplate.prefill
  return message
}

export const activeTemplateFor = (valueKey: ValueKey | null, tplId: string | null): PraiseTemplate | null =>
  valueKey ? (VALUE_TEMPLATES[valueKey].find((template) => template.id === tplId) ?? VALUE_TEMPLATES[valueKey][0] ?? null) : null

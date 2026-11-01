// Pure LinkedIn-share helper functions — no DOM access.
// Post text drafts, AI-style polish and the plain LinkedIn composer URL that
// does NOT pre-fill anything (LinkedIn removed prefill; the text travels
// through the clipboard).

export interface PostDraftFields {
  /** Person or team being praised ("Priya" or "Priya and Kenji"). */
  receiver: string
  /** Who gave the recognition (first name is fine). */
  giver: string
  /** Value chip label ("Ownership" | undefined). */
  value?: string
  /** The recognition note, already trimmed. */
  message: string
}

const TAIL = '\n\n#emidsRecognition #EmployeeRecognition #emids'

/** Pre-written LinkedIn post text from a recognition. */
export function buildPostDraft({ receiver, giver, value, message }: PostDraftFields): string {
  const lines = [
    'Proud to share that this got recognized at emids. 🎉',
    '',
    `${receiver} — ${message.replace(/^"|"$/g, '')}`,
    '',
    `Recognized by ${giver}${value ? ` · ${value}` : ''} · emids Technologies`,
  ]
  return lines.join('\n') + TAIL
}

/** The compose page's polish move, applied to a LinkedIn draft. */
export function polishPostText(text: string): string {
  if (text.trim().length < 10) return text
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\.?$/, '.')
    .concat(' This made a real difference — thank you for setting the standard.')
}

/** The exact LinkedIn URL the user chose: the sharing compose box. */
export function linkedinComposerUrl(): string {
  return 'https://www.linkedin.com/sharing/compose'
}

import { describe, it, expect } from 'vitest'
import { buildPostDraft, polishPostText, linkedinComposerUrl } from '@/lib/share-post'

const fields = {
  receiver: 'Priya',
  giver: 'Daniel Cho',
  value: 'Ownership',
  message: 'shipped the quarterly data pack.',
}

describe('buildPostDraft', () => {
  it('writes a pre-filled LinkedIn draft with names, value and hashtags', () => {
    const text = buildPostDraft(fields)
    expect(text).toContain('Priya — shipped the quarterly data pack.')
    expect(text).toContain('Recognized by Daniel Cho · Ownership · emids Technologies')
    expect(text).toContain('#emidsRecognition')
  })

  it('strips the surrounding quotes from the note', () => {
    const text = buildPostDraft({ ...fields, message: '"a clean win."' })
    expect(text).toContain('a clean win.')
    expect(text).not.toContain('"a')
  })
})

describe('polishPostText', () => {
  it('appends the standard-close sentence', () => {
    const out = polishPostText('Priya — shipped the work on time.')
    expect(out).toContain('This made a real difference')
  })

  it('leaves short text untouched', () => {
    const out = polishPostText('tiny')
    expect(out).toBe('tiny')
  })
})

describe('linkedinComposerUrl', () => {
  it('opens exactly LinkedIn sharing/compose (user-pinned URL, no auto-post)', () => {
    expect(linkedinComposerUrl()).toBe('https://www.linkedin.com/sharing/compose')
  })
})

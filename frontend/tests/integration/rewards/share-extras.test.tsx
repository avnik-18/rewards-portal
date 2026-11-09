import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ShareComposer from '@/components/organisms/ShareComposer'
import TemplateCard from '@/components/molecules/TemplateCard'
import RecognitionsReceived from '@/components/organisms/recognitions-received'
import { CORE_VALUES } from '@/lib/mock-data'
import type { RecognitionReceived } from '@/lib/data-api'

beforeEach(() => {
  document.body.textContent = ''
})

describe('ShareComposer extras', () => {
  it('AI Polish appends the closer once the text is long enough', async () => {
    render(
      <ShareComposer
        recognitionId="rc1"
        receiverName="Ayan"
        giverNames="Daniel Cho"
        valueLabel="Ownership"
        message="Cleanest handoff doc I have seen on this team."
        onClose={vi.fn()}
      />,
    )
    const text = await screen.findByPlaceholderText('Write or edit your LinkedIn post…')
    fireEvent.change(text, { target: { value: 'My own LinkedIn post words here.' } })
    fireEvent.click(screen.getByRole('button', { name: /AI Polish/i }))
    await waitFor(() => expect((text as HTMLTextAreaElement).value).toContain('This made a real difference'))
  })

  it('clicking the dimmed backdrop closes the share composer', async () => {
    const onClose = vi.fn()
    render(
      <ShareComposer
        recognitionId="rc1"
        receiverName="Ayan"
        giverNames="Daniel Cho"
        valueLabel="Ownership"
        message="Cleanest handoff doc I have seen on this team."
        onClose={onClose}
      />,
    )
    await screen.findByText('Share this recognition')
    fireEvent.click(document.querySelector('.backdrop-blur-\\[3px\\]') as HTMLElement)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('TemplateCard (all branches)', () => {
  const value = CORE_VALUES['ownership']

  it('renders large with banner, message, recipients, points and value chip', () => {
    render(
      <TemplateCard
        big
        url="/xoxo/ownership_01.webp"
        previewValue={value}
        recipients={[
          { id: 'p1', label: 'Aarav' },
          { id: 'p3', label: 'Priya' },
        ]}
        points={25}
        msg="Priya shipped the migration early."
      />,
    )
    expect(document.querySelector('img')?.getAttribute('src')).toBe('/xoxo/ownership_01.webp')
    expect(screen.getByText('Priya shipped the migration early.')).toBeTruthy()
    expect(screen.getAllByText('Ownership').length).toBeGreaterThan(0)
    expect(screen.getByText('+25 pts')).toBeTruthy()
    expect(screen.getByText('Aarav, Priya')).toBeTruthy()
  })

  it('falls back small: no banner, empty message placeholder, no strip extras', () => {
    render(<TemplateCard previewValue={null} recipients={[]} points={0} msg="   " />)
    expect(document.querySelector('img')).toBeNull()
    expect(screen.getByText('Your praise shows up here live as you type…')).toBeTruthy()
    expect(screen.queryByText('+0 pts')).toBeNull()
  })
})

describe('RecognitionsReceived expand/collapse', () => {
  const templateItem: RecognitionReceived = {
    id: 'rcx',
    fromId: 'p2',
    when: 'just now',
    message: 'Tenure offsite — the coordination was flawless.',
    template: { name: 'Ownership post', emoji: '🤝' },
    artUrl: '/xoxo/ownership_01.webp',
  } as unknown as RecognitionReceived

  it('expands the postcard, then collapses it again, and treats missing points as zero', () => {
    render(<RecognitionsReceived items={[templateItem]} />)

    const row = screen.getByRole('button', { name: /Daniel Cho/ })
    expect(row.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(row)
    expect(screen.getByRole('button', { name: /Daniel Cho/ }).getAttribute('aria-expanded')).toBe('true')
    // the recognized-you membership strip renders even without a points value
    expect(screen.getByText('Ayan')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Daniel Cho/ }))
    expect(screen.getByRole('button', { name: /Daniel Cho/ }).getAttribute('aria-expanded')).toBe('false')
  })
})

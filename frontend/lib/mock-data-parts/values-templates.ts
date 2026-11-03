export type ValueKey = 'customerFirst' | 'innovation' | 'collaboration' | 'ownership' | 'winningMindset'

export interface CoreValue {
  label: string
  ink: string
  soft: string
  /** Solid hex used by the "Values you live" progress bars. */
  solid: string
}

export const CORE_VALUES: Record<ValueKey, CoreValue> = {
  customerFirst: { label: 'Customer First', ink: 'text-value-cf', soft: 'bg-value-cf-soft', solid: '#0fa3a3' },
  innovation: { label: 'Innovation', ink: 'text-value-in', soft: 'bg-value-in-soft', solid: '#ff8938' },
  collaboration: { label: 'Collaboration', ink: 'text-value-co', soft: 'bg-value-co-soft', solid: '#7a5af8' },
  ownership: { label: 'Ownership', ink: 'text-value-ow', soft: 'bg-value-ow-soft', solid: '#17b26a' },
  winningMindset: { label: 'Winning Mindset', ink: 'text-value-wm', soft: 'bg-value-wm-soft', solid: '#ff5a5f' },
}

export const VALUE_KEYS = Object.keys(CORE_VALUES) as ValueKey[]

export interface PraiseTemplate {
  id: string
  name: string
  emoji: string
  /** 6 banner variants (3 people-photo, 3 illustration) at 1100x314. */
  urls: string[]
  prefill: string
}

export const VALUE_TEMPLATES: Record<ValueKey, PraiseTemplate[]> = {
  customerFirst: [
    {
      id: 'cf-star',
      name: 'Service Star',
      emoji: '⭐',
      urls: [
        '/xoxo/customer_first_01.webp',
        '/xoxo/customer_first_02.webp',
        '/xoxo/customer_first_03.webp',
        '/xoxo/customer_first_illu_01.webp',
        '/xoxo/customer_first_illu_02.webp',
        '/xoxo/customer_first_illu_03.webp',
      ],
      prefill: 'Thank you for putting the client first this week — every request you took got a quick, clear reply.',
    },
  ],
  innovation: [
    {
      id: 'in-spark',
      name: 'Fresh Spark',
      emoji: '💡',
      urls: [
        '/xoxo/innovation_01.webp',
        '/xoxo/innovation_02.webp',
        '/xoxo/innovation_03.webp',
        '/xoxo/innovation_illu_01.webp',
        '/xoxo/innovation_illu_02.webp',
        '/xoxo/innovation_illu_03.webp',
      ],
      prefill: 'The simpler way you found is saving all of us real time now — great catch, and thank you.',
    },
  ],
  collaboration: [
    {
      id: 'co-team',
      name: 'One Team',
      emoji: '🤝',
      urls: [
        '/xoxo/collaboration_01.webp',
        '/xoxo/collaboration_02.webp',
        '/xoxo/collaboration_03.webp',
        '/xoxo/collaboration_illu_01.webp',
        '/xoxo/collaboration_illu_02.webp',
        '/xoxo/collaboration_illu_03.webp',
      ],
      prefill: 'Thanks for jumping in to help another team this week — we all noticed, and they did too.',
    },
  ],
  ownership: [
    {
      id: 'ow-done',
      name: 'Done & Done',
      emoji: '✅',
      urls: [
        '/xoxo/ownership_01.webp',
        '/xoxo/ownership_02.webp',
        '/xoxo/ownership_03.webp',
        '/xoxo/ownership_illu_01.webp',
        '/xoxo/ownership_illu_02.webp',
        '/xoxo/ownership_illu_03.webp',
      ],
      prefill: 'You took this end-to-end and closed it out — no follow-up needed, just results.',
    },
  ],
  winningMindset: [
    {
      id: 'wm-drive',
      name: 'Winning Drive',
      emoji: '🏆',
      urls: [
        '/xoxo/winning_mindset_01.webp',
        '/xoxo/winning_mindset_02.webp',
        '/xoxo/winning_mindset_03.webp',
        '/xoxo/winning_mindset_illu_01.webp',
        '/xoxo/winning_mindset_illu_02.webp',
        '/xoxo/winning_mindset_illu_03.webp',
      ],
      prefill: 'You brought the energy when it mattered most — momentum like that lifts the whole sprint.',
    },
  ],
}

/* ---------- Feed slice (recognition journey on profiles, home feed) ---------- */

import TemplateCard from '@/components/molecules/TemplateCard'

interface ShareCardShelfProps {
  /** Banner options of the value (or fallback); selectedCard is one of them. */
  cards: string[]
  selectedCard: string
  onSelectCard: (imageIndex: number) => void
  valueLabel?: string
  message: string
}

/** Step 1 visual — the postcard as it will attach, plus the banner switcher. */
export default function ShareCardShelf({
  cards,
  selectedCard,
  onSelectCard,
  valueLabel,
  message,
}: ShareCardShelfProps) {
  return (
    <>
      <p className="mb-1.5 text-[10.5px] font-extrabold font-mono uppercase tracking-[0.14em] text-muted">
        Your card (optional attach)
      </p>
      <div className="overflow-hidden rounded-2xl border border-[#C9E4F2] bg-white">
        <TemplateCard
          url={selectedCard}
          previewValue={
            valueLabel ? { label: valueLabel, ink: 'text-brand', soft: 'bg-brand-soft', solid: '#0e9384' } : null
          }
          recipients={[]}
          points={0}
          msg={message}
        />
      </div>

      {cards.length > 1 ? (
        <div className="mt-2 grid grid-cols-6 gap-1.5">
          {cards.map((bannerUrl, optionIndex) => (
            <button
              key={bannerUrl}
              onClick={() => onSelectCard(optionIndex)}
              aria-label={`Card image option ${optionIndex + 1}`}
              aria-pressed={bannerUrl === selectedCard}
              className={`relative block w-full overflow-hidden rounded-md border-2 ${bannerUrl === selectedCard ? 'border-brand' : 'border-transparent'}`}
              style={{ backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              <span className="block aspect-[1100/240] w-full" />
            </button>
          ))}
        </div>
      ) : null}
    </>
  )
}

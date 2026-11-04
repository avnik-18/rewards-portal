import Image from 'next/image'
import { Avatar } from '@/components/atoms'
import type { CoreValue } from '@/lib/mock-data'

export interface TemplateCardProps {
  tpl?: { name: string; emoji: string }
  url?: string
  previewValue: CoreValue | null
  recipients: { id: string; label: string }[]
  points: number
  msg: string
  big?: boolean
}

/** The praise postcard: banner, live message, recipient + points + value strip. */
export default function TemplateCard({ url, previewValue, recipients, points, msg, big = false }: TemplateCardProps) {
  const pad = big ? 'px-5' : 'px-3.5'
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card ${big ? 'rounded-3xl' : ''}`}
    >
      {url && (
        <div className="border-b border-line bg-brand-soft/30">
          {/* Banner URLs are local /xoxo files, so next/image standard usage applies */}
          <Image src={url} alt="" width={1100} height={314} className="block min-h-[150px] w-full object-cover" />
        </div>
      )}
      <div className={`${pad} ${big ? 'py-5' : 'py-4'}`}>
        <p className={`leading-relaxed text-ink ${big ? 'text-[15px]' : 'text-[13px]'}`}>
          {msg.trim() ? msg : <span className="italic text-muted">Your praise shows up here live as you type…</span>}
        </p>
      </div>
      <div
        className={`mt-auto flex flex-wrap items-center gap-2 border-y border-line ${pad} ${big ? 'py-3.5' : 'py-3'}`}
      >
        {recipients.length > 0 && (
          <>
            <div className="flex -space-x-2">
              {recipients.slice(0, 3).map((recipient) => (
                <span key={recipient.id} className="rounded-full ring-2 ring-white">
                  <Avatar id={recipient.id} size={20} />
                </span>
              ))}
            </div>
            <span className="truncate text-[11px] font-bold text-navy">
              {recipients.map((recipient) => recipient.label).join(', ')}
            </span>
          </>
        )}
        {points > 0 && (
          <span className="tnum rounded-full bg-gold px-2 py-0.5 text-[10px] font-extrabold text-[#3d2b00]">
            +{points} pts
          </span>
        )}
        {previewValue && (
          <span
            className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${previewValue.soft} ${previewValue.ink}`}
          >
            {previewValue.label}
          </span>
        )}
      </div>
    </div>
  )
}

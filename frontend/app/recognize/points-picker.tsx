'use client'

import type { ComposeFormApi } from '@/hooks/use-compose-form'

/** Attach-points presets — 0 is "Skip"; the gold chip marks the active amount. */
export default function PointsPicker({ form }: { form: ComposeFormApi }) {
  return (
    <>
      <p className="mb-1.5 mt-5 text-[11.5px] font-extrabold font-mono uppercase tracking-[0.12em] text-muted">
        Attach points
      </p>
      <div className="grid grid-cols-4 gap-1.5">
        {form.POINT_PRESETS.map((preset: number) => (
          <button
            key={preset}
            onClick={() => form.setPoints(preset)}
            className={`tnum rounded-xl border py-2.5 text-[13px] font-extrabold transition active:scale-95 ${
              form.points === preset
                ? 'border-gold bg-gold text-[#3d2b00]'
                : 'border-line bg-white text-muted hover:border-gold/50 hover:text-ink'
            }`}
          >
            {preset === 0 ? 'Skip' : `+${preset}`}
          </button>
        ))}
      </div>
      {form.errors.points && (
        <p role="alert" className="mt-1 text-[12px] font-bold text-coral">
          {form.errors.points}
        </p>
      )}
    </>
  )
}

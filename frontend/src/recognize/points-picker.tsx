import type { ComposeFormApi } from '@/hooks/use-compose-form'

/** Attach-points presets for leaders — 0 is "Skip"; the gold chip marks the
 *  active amount. Employees compose zero-point peer cheers instead: the
 *  picker is replaced by the green Cheers-for-peers banner, so
 *  emp-to-emp recognition never carries points. */
export default function PointsPicker({ form, canAwardPoints }: { form: ComposeFormApi; canAwardPoints: boolean }) {
  if (!canAwardPoints) {
    return (
      <div className="mt-5 rounded-2xl border border-[#bfe8cf] bg-[#e9faf1] px-4 py-3.5">
        <p className="text-[14px] font-extrabold tracking-wide text-[#0d8a4b]">Cheers for peers</p>
        <p className="mt-0.5 text-[12.5px] font-medium text-[#2f7d55]">
          Peer-to-peer recognition celebrates with no points — managers and leads attach points.
        </p>
      </div>
    )
  }

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

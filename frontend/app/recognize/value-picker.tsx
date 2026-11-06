'use client'

import type { ComposeFormApi } from '@/hooks/use-compose-form'
import { CORE_VALUES, VALUE_KEYS } from '@/lib/data-api'

/** The five emids values — clicking one attaches it to the recognition. */
export default function ValuePicker({ form }: { form: ComposeFormApi }) {
  return (
    <>
      <p className="mb-1.5 mt-5 text-[11.5px] font-extrabold font-mono uppercase tracking-[0.12em] text-muted">
        Which emids value did they demonstrate?
      </p>
      <div className="flex flex-wrap gap-2">
        {VALUE_KEYS.map((valueKey) => {
          const value = CORE_VALUES[valueKey]
          const chosen = form.valueKey === valueKey
          return (
            <button
              key={valueKey}
              onClick={() => form.chooseValue(valueKey)}
              className={`rounded-xl border px-3.5 py-2 text-[13px] font-bold transition active:scale-95 ${value.soft} ${value.ink} ${
                chosen ? 'border-current' : 'border-transparent opacity-75 hover:opacity-100'
              }`}
            >
              {value.label}
            </button>
          )
        })}
      </div>
      {form.errors.valueKey && (
        <p role="alert" className="mt-1.5 text-[12px] font-bold text-coral">
          {form.errors.valueKey}
        </p>
      )}
    </>
  )
}

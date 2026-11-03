import { Card } from '@/components/atoms'
import { CORE_VALUES } from '@/lib/mock-data'
import type { ValueLived } from '@/lib/mock-data'

export interface ValuesYouLiveProps {
  values: ValueLived[]
}

export default function ValuesYouLive({ values }: ValuesYouLiveProps) {
  const max = Math.max(...values.map((livedValue) => livedValue.count), 1)
  const sorted = [...values].sort((a, b) => b.count - a.count)

  return (
    <div>
      <h2 className="mb-3 text-xl font-extrabold tracking-tight text-navy">Values you live</h2>
      <Card className="p-5">
        <div className="space-y-3">
          {sorted.map((livedValue) => {
            const core = CORE_VALUES[livedValue.key]
            return (
              <div key={livedValue.key}>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className={`font-bold ${core.ink}`}>{core.label}</span>
                  <span className="tnum font-extrabold text-muted">{livedValue.count}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#E9EEF7]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(livedValue.count / max) * 100}%`, background: core.solid }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

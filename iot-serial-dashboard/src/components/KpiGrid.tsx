import { Gauge, Mountain, Thermometer } from 'lucide-react'
import { classify } from '../lib/thresholds'
import type { DashboardState } from '../hooks/useSensorStore'
import type { Thresholds } from '../types/sensor'
import { KpiCard } from './KpiCard'

interface Props {
  state: DashboardState
  now: number
  thresholds: Thresholds
}

export function KpiGrid({ state, now, thresholds }: Props) {
  const { latest, stats } = state
  const waiting = latest === null

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <KpiCard
        title="Suhu"
        unit="°C"
        icon={Thermometer}
        value={latest?.temp ?? null}
        status={latest ? classify(latest.temp, thresholds.temp) : 'none'}
        min={stats.temp?.min ?? null}
        max={stats.temp?.max ?? null}
        updatedAt={latest?.t ?? null}
        now={now}
        waiting={waiting}
      />
      <KpiCard
        title="Altitude"
        unit="m"
        icon={Mountain}
        value={latest?.alt ?? null}
        status={latest ? classify(latest.alt, thresholds.alt) : 'none'}
        min={stats.alt?.min ?? null}
        max={stats.alt?.max ?? null}
        updatedAt={latest?.t ?? null}
        now={now}
        waiting={waiting}
        note="Referensi tekanan laut 1013.25 hPa"
        tooltip="Altitude diturunkan dari tekanan sehingga dapat bergoyang beberapa meter."
      />
      <KpiCard
        title="Tekanan"
        unit="hPa"
        icon={Gauge}
        value={latest?.press ?? null}
        status={latest ? classify(latest.press, thresholds.press) : 'none'}
        min={stats.press?.min ?? null}
        max={stats.press?.max ?? null}
        updatedAt={latest?.t ?? null}
        now={now}
        waiting={waiting}
      />
    </section>
  )
}

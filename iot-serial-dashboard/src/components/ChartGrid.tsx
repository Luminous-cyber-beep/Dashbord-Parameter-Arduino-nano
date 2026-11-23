import type { DashboardState } from '../hooks/useSensorStore'
import type { Thresholds } from '../types/sensor'
import { MetricChart } from './MetricChart'

interface Props {
  state: DashboardState
  windowMs: number
  thresholds: Thresholds
}

export function ChartGrid({ state, windowMs, thresholds }: Props) {
  const { chartBuffer } = state

  return (
    <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <MetricChart title="Grafik Suhu" unit="°C" metric="temp" color="#ef4444" data={chartBuffer} windowMs={windowMs} threshold={thresholds.temp} yMinSpan={2} />
      <MetricChart title="Grafik Altitude" unit="m" metric="alt" color="#3b82f6" data={chartBuffer} windowMs={windowMs} threshold={thresholds.alt} yMinSpan={4} />
      <MetricChart title="Grafik Tekanan" unit="hPa" metric="press" color="#8b5cf6" data={chartBuffer} windowMs={windowMs} threshold={thresholds.press} yMinSpan={1} />
    </section>
  )
}

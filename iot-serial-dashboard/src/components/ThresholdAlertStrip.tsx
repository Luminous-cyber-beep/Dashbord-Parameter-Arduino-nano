import { DISPLAY_METRIC_KEYS } from '../lib/constants'
import { classify, metricLabel } from '../lib/thresholds'
import type { SensorReading, Thresholds } from '../types/sensor'

interface Props {
  reading: SensorReading | null
  thresholds: Thresholds
}

const STATUS_TEXT = {
  warning: 'Waspada',
  danger: 'Bahaya',
} as const

export function ThresholdAlertStrip({ reading, thresholds }: Props) {
  if (!reading) return null

  const alerts = DISPLAY_METRIC_KEYS.flatMap((key) => {
    const value = reading[key]
    if (value === null) return []
    const status = classify(value, thresholds[key])
    if (status !== 'warning' && status !== 'danger') return []
    const limit = status === 'danger'
      ? (value > (thresholds[key].dangerMax ?? Infinity) ? thresholds[key].dangerMax : thresholds[key].dangerMin)
      : (value > (thresholds[key].warnMax ?? Infinity) ? thresholds[key].warnMax : thresholds[key].warnMin)
    return [{ key, status, text: `${metricLabel(key)} ${value.toFixed(1)}: ${STATUS_TEXT[status]}${limit !== null ? ` (batas ${limit})` : ''}` }]
  })

  if (alerts.length === 0) return null

  return (
    <section className="space-y-2" aria-live="polite">
      {alerts.map((alert) => (
        <div
          key={alert.key}
          className={`rounded-xl px-4 py-2 text-sm ${alert.status === 'danger' ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'}`}
        >
          {alert.text}
        </div>
      ))}
    </section>
  )
}
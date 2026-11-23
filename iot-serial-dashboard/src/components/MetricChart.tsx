import { memo, useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatLocalTime } from '../lib/format'
import type { MetricKey, SensorReading, ThresholdRange } from '../types/sensor'

interface Props {
  title: string
  unit: string
  metric: MetricKey
  color: string
  data: SensorReading[]
  windowMs: number
  threshold: ThresholdRange
  yMinSpan: number
  na?: boolean
  naLabel?: string
  naHint?: string
}

function yDomain(values: number[], minSpan: number): [number, number] {
  if (values.length === 0) return [0, minSpan]
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (max - min < minSpan) {
    const mid = (min + max) / 2
    min = mid - minSpan / 2
    max = mid + minSpan / 2
  }
  const pad = (max - min) * 0.15 || minSpan * 0.15
  return [min - pad, max + pad]
}

export const MetricChart = memo(function MetricChart({
  title, unit, metric, color, data, windowMs, threshold, yMinSpan, na = false, naLabel, naHint,
}: Props) {
  const latestTime = data.at(-1)?.t ?? Date.now()
  const domainMin = latestTime - windowMs
  const points = useMemo(
    () => data.filter((row) => row.t >= domainMin && row[metric] !== null).map((row) => ({ t: row.t, value: row[metric] as number })),
    [data, domainMin, metric],
  )
  const domain = useMemo(() => yDomain(points.map((p) => p.value), yMinSpan), [points, yMinSpan])

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">{unit}</span>
      </div>

      {na ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl bg-slate-50 text-center dark:bg-slate-950/40">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{naLabel ?? 'N/A'}</p>
          {naHint && <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">{naHint}</p>}
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={[domainMin, latestTime]}
                tickFormatter={(value) => formatLocalTime(Number(value))}
                minTickGap={40}
                tick={{ fontSize: 11 }}
              />
              <YAxis domain={domain} tick={{ fontSize: 11 }} width={56} />
              <Tooltip
                labelFormatter={(value) => formatLocalTime(Number(value))}
                formatter={(value) => [`${Number(value).toFixed(1)} ${unit}`, title]}
              />
              {threshold.warnMin !== null && <ReferenceLine y={threshold.warnMin} stroke="#d97706" strokeDasharray="4 4" />}
              {threshold.warnMax !== null && <ReferenceLine y={threshold.warnMax} stroke="#d97706" strokeDasharray="4 4" />}
              {threshold.dangerMin !== null && <ReferenceLine y={threshold.dangerMin} stroke="#dc2626" strokeDasharray="4 4" />}
              {threshold.dangerMax !== null && <ReferenceLine y={threshold.dangerMax} stroke="#dc2626" strokeDasharray="4 4" />}
              <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.12} isAnimationActive={false} dot={false} connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </article>
  )
})

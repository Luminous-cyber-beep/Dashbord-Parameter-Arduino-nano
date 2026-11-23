import type { MetricKey, Thresholds } from '../types/sensor'

export const LIMITS = {
  CHART_BUFFER: 120,
  SESSION_ROWS: 20_000,
  RAW_LOG_LINES: 200,
  MAX_LINE_CHARS: 4_096,
  STALE_AFTER_MS: 5_000,
  INVALID_STREAK_HINT: 5,
  MAX_LOG_TEXT_CHARS: 500,
} as const

export const METRIC_KEYS = ['temp', 'alt', 'hum', 'press'] as const satisfies readonly MetricKey[]
export const DISPLAY_METRIC_KEYS = ['temp', 'alt', 'press'] as const satisfies readonly MetricKey[]

export const RANGE: Record<MetricKey, readonly [number, number]> = {
  temp: [-40, 85],
  alt: [-500, 9000],
  hum: [0, 100],
  press: [300, 1100],
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  temp: { warnMin: 18, warnMax: 35, dangerMin: 10, dangerMax: 38 },
  alt: { warnMin: null, warnMax: null, dangerMin: null, dangerMax: null },
  hum: { warnMin: 30, warnMax: 80, dangerMin: 20, dangerMax: 90 },
  press: { warnMin: 980, warnMax: 1020, dangerMin: 960, dangerMax: 1040 },
}

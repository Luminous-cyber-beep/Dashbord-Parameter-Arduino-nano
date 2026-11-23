import { DEFAULT_THRESHOLDS, METRIC_KEYS } from './constants'
import type { MetricKey, ThresholdRange, ThresholdStatus, Thresholds } from '../types/sensor'

export const THRESHOLDS_STORAGE_KEY = 'iot-dashboard:v1:thresholds'

export function classify(value: number, range: ThresholdRange): ThresholdStatus {
  const all = [range.warnMin, range.warnMax, range.dangerMin, range.dangerMax]
  if (all.every((x) => x === null)) return 'none'
  if ((range.dangerMin !== null && value < range.dangerMin) || (range.dangerMax !== null && value > range.dangerMax)) {
    return 'danger'
  }
  if ((range.warnMin !== null && value < range.warnMin) || (range.warnMax !== null && value > range.warnMax)) {
    return 'warning'
  }
  return 'normal'
}

function isNumOrNull(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value))
}

function isRange(value: unknown): value is ThresholdRange {
  if (typeof value !== 'object' || value === null) return false
  const r = value as Record<string, unknown>
  return isNumOrNull(r.warnMin) && isNumOrNull(r.warnMax) && isNumOrNull(r.dangerMin) && isNumOrNull(r.dangerMax)
}

export function isValidRange(range: ThresholdRange): boolean {
  const { warnMin, warnMax, dangerMin, dangerMax } = range
  const values = [dangerMin, warnMin, warnMax, dangerMax].filter((v): v is number => v !== null)
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] < values[i - 1]) return false
  }
  if (warnMin !== null && dangerMin !== null && warnMin < dangerMin) return false
  if (warnMax !== null && dangerMax !== null && warnMax > dangerMax) return false
  if (warnMin !== null && warnMax !== null && warnMin > warnMax) return false
  if (dangerMin !== null && dangerMax !== null && dangerMin > dangerMax) return false
  return true
}

export function validateThresholds(thresholds: Thresholds): boolean {
  return METRIC_KEYS.every((key) => isValidRange(thresholds[key]))
}

export function normalizeThresholds(input: unknown): Thresholds {
  const source = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}
  const next = {} as Thresholds
  for (const key of METRIC_KEYS) {
    const raw = source[key]
    next[key] = isRange(raw) ? raw : DEFAULT_THRESHOLDS[key]
  }
  return next
}

export function loadThresholds(): Thresholds {
  try {
    const raw = localStorage.getItem(THRESHOLDS_STORAGE_KEY)
    if (!raw) return DEFAULT_THRESHOLDS
    return normalizeThresholds(JSON.parse(raw))
  } catch {
    return DEFAULT_THRESHOLDS
  }
}

export function saveThresholds(thresholds: Thresholds): void {
  try {
    localStorage.setItem(THRESHOLDS_STORAGE_KEY, JSON.stringify(thresholds))
  } catch {
    // abaikan
  }
}

export function metricLabel(key: MetricKey): string {
  switch (key) {
    case 'temp': return 'Suhu'
    case 'alt': return 'Altitude'
    case 'hum': return 'Kelembapan'
    case 'press': return 'Tekanan'
  }
}

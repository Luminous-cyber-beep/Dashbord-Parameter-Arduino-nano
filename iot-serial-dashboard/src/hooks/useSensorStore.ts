import { useReducer } from 'react'
import { LIMITS, METRIC_KEYS } from '../lib/constants'
import { isBlankLine, parseLine } from '../lib/parser'
import type {
  MetricKey,
  RawLogEntry,
  SensorMode,
  SensorReading,
} from '../types/sensor'

export type MetricStats = Record<MetricKey, { min: number; max: number } | null>

export interface DashboardState {
  mode: SensorMode
  latest: SensorReading | null
  chartBuffer: SensorReading[]
  sessionRows: SensorReading[]
  stats: MetricStats
  hwError: { message: string; at: number } | null
  rawLog: RawLogEntry[]
  counters: { valid: number; hwError: number; invalid: number; invalidStreak: number }
  sessionTruncated: boolean
  nextLogId: number
}

export type DashboardAction =
  | { type: 'LINE'; raw: string; at?: number }
  | { type: 'READING'; reading: SensorReading }
  | { type: 'HW_ERROR'; message: string; at?: number }
  | { type: 'INVALID'; reason: string }
  | { type: 'DISMISS_HW_ERROR' }
  | { type: 'CLEAR_RAW_LOG' }
  | { type: 'RESET_SESSION' }

export function createInitialState(): DashboardState {
  return {
    mode: 'unknown',
    latest: null,
    chartBuffer: [],
    sessionRows: [],
    stats: { temp: null, alt: null, hum: null, press: null },
    hwError: null,
    rawLog: [],
    counters: { valid: 0, hwError: 0, invalid: 0, invalidStreak: 0 },
    sessionTruncated: false,
    nextLogId: 1,
  }
}

function updateStats(stats: MetricStats, reading: SensorReading): MetricStats {
  const next = { ...stats }
  for (const key of METRIC_KEYS) {
    const value = reading[key]
    if (value === null) continue
    const current = stats[key]
    next[key] = current === null
      ? { min: value, max: value }
      : { min: Math.min(current.min, value), max: Math.max(current.max, value) }
  }
  return next
}

export function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'LINE': {
      const at = action.at ?? Date.now()
      if (isBlankLine(action.raw)) return state

      const parsed = parseLine(action.raw, at)
      const entry: RawLogEntry = {
        id: state.nextLogId,
        t: at,
        text: action.raw.slice(0, LIMITS.MAX_LOG_TEXT_CHARS),
        kind: parsed.kind,
        ...(parsed.kind === 'invalid' ? { reason: parsed.reason } : {}),
      }
      const withLog: DashboardState = {
        ...state,
        rawLog: [...state.rawLog, entry].slice(-LIMITS.RAW_LOG_LINES),
        nextLogId: state.nextLogId + 1,
      }

      if (parsed.kind === 'reading') {
        return dashboardReducer(withLog, { type: 'READING', reading: parsed.reading })
      }
      if (parsed.kind === 'hw-error') {
        return dashboardReducer(withLog, { type: 'HW_ERROR', message: parsed.message, at })
      }
      return dashboardReducer(withLog, { type: 'INVALID', reason: parsed.reason })
    }

    case 'READING': {
      const reading = action.reading
      return {
        ...state,
        mode: reading.hum === null ? 'BMP280' : 'BME280',
        latest: reading,
        chartBuffer: [...state.chartBuffer, reading].slice(-LIMITS.CHART_BUFFER),
        sessionRows: [...state.sessionRows, reading].slice(-LIMITS.SESSION_ROWS),
        stats: updateStats(state.stats, reading),
        hwError: null,
        sessionTruncated: state.sessionTruncated || state.sessionRows.length >= LIMITS.SESSION_ROWS,
        counters: { ...state.counters, valid: state.counters.valid + 1, invalidStreak: 0 },
      }
    }

    case 'HW_ERROR':
      return {
        ...state,
        hwError: { message: action.message, at: action.at ?? Date.now() },
        counters: { ...state.counters, hwError: state.counters.hwError + 1 },
      }

    case 'INVALID':
      return {
        ...state,
        counters: {
          ...state.counters,
          invalid: state.counters.invalid + 1,
          invalidStreak: state.counters.invalidStreak + 1,
        },
      }

    case 'DISMISS_HW_ERROR':
      return { ...state, hwError: null }

    case 'CLEAR_RAW_LOG':
      return { ...state, rawLog: [] }

    case 'RESET_SESSION':
      return createInitialState()
  }
}

export function useSensorStore() {
  const [state, dispatch] = useReducer(dashboardReducer, createInitialState())
  return { state, dispatch }
}

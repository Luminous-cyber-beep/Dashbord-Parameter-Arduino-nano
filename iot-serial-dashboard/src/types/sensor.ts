export type MetricKey = 'temp' | 'alt' | 'hum' | 'press'

export interface SensorReading {
  t: number
  temp: number
  alt: number
  press: number
  hum: number | null
  lat: number | null
  lng: number | null
}

export type ParsedLine =
  | { kind: 'reading'; reading: SensorReading }
  | { kind: 'hw-error'; message: string }
  | { kind: 'invalid'; reason: string }

export type SensorMode = 'unknown' | 'BMP280' | 'BME280'

export type RawLogKind = ParsedLine['kind']

export interface RawLogEntry {
  id: number
  t: number
  text: string
  kind: RawLogKind
  reason?: string
}

export interface ThresholdRange {
  warnMin: number | null
  warnMax: number | null
  dangerMin: number | null
  dangerMax: number | null
}

export type ThresholdStatus = 'normal' | 'warning' | 'danger' | 'none'

export type Thresholds = Record<MetricKey, ThresholdRange>

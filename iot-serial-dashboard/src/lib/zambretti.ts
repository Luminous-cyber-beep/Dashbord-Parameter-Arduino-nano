import type { SensorReading } from '../types/sensor'

export type PressureTrend = 'Rising' | 'Steady' | 'Falling'

export interface WeatherForecast {
  trend: PressureTrend
  trendHpaPerHour: number
  z: number
  label: string
  detail: string
  severity: 'good' | 'warn' | 'danger'
}

const Z_TEXT: Record<number, { label: string; severity: WeatherForecast['severity'] }> = {
  1: { label: 'Cerah Stabil', severity: 'good' },
  2: { label: 'Cerah', severity: 'good' },
  3: { label: 'Cerah Berawan', severity: 'good' },
  4: { label: 'Berawan', severity: 'warn' },
  5: { label: 'Perubahan Cuaca', severity: 'warn' },
  6: { label: 'Hujan Ringan', severity: 'warn' },
  7: { label: 'Hujan', severity: 'warn' },
  8: { label: 'Waspada Badai', severity: 'danger' },
  9: { label: 'Badai', severity: 'danger' },
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function pressureTrend(readings: SensorReading[], now = Date.now()): { trend: PressureTrend; deltaPerHour: number } {
  if (readings.length < 2) return { trend: 'Steady', deltaPerHour: 0 }
  const windowMs = 30 * 60 * 1000
  const target = now - windowMs
  let baseline = readings[0]
  for (const reading of readings) {
    if (reading.t <= target) baseline = reading
    else break
  }
  const latest = readings[readings.length - 1]
  const dtHours = Math.max((latest.t - baseline.t) / 3_600_000, 1 / 60)
  const deltaPerHour = (latest.press - baseline.press) / dtHours
  const trend: PressureTrend = deltaPerHour > 1.6 ? 'Rising' : deltaPerHour < -1.6 ? 'Falling' : 'Steady'
  return { trend, deltaPerHour }
}

export function computeZambretti(pressureHpa: number, trend: PressureTrend, month = new Date().getMonth() + 1): number {
  let z: number
  if (trend === 'Falling') z = Math.round(127 - 0.12 * pressureHpa)
  else if (trend === 'Rising') z = Math.round(185 - 0.16 * pressureHpa)
  else z = Math.round(144 - 0.13 * pressureHpa)

  const isWinter = month <= 2 || month === 12
  if (trend === 'Rising') z += isWinter ? 1 : 0
  if (trend === 'Falling') z -= 1

  if (trend === 'Falling') return clamp(z, 1, 9)
  if (trend === 'Rising') return clamp(z, 1, 9)
  return clamp(z, 1, 9)
}

export function forecastWeather(readings: SensorReading[], now = Date.now()): WeatherForecast | null {
  const latest = readings.at(-1)
  if (!latest) return null
  const { trend, deltaPerHour } = pressureTrend(readings, now)
  const z = computeZambretti(latest.press, trend)
  const mapped = Z_TEXT[z]
  return {
    trend,
    trendHpaPerHour: deltaPerHour,
    z,
    label: mapped.label,
    detail: `Zambretti Z=${z} · ${latest.press.toFixed(1)} hPa`,
    severity: mapped.severity,
  }
}

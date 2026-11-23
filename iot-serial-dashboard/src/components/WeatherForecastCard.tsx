import { Cloud, CloudDrizzle, CloudLightning, CloudRain, CloudSun, Sun, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { forecastWeather } from '../lib/zambretti'
import type { SensorReading } from '../types/sensor'

interface Props {
  readings: SensorReading[]
}

const ICON = {
  'Cerah Stabil': Sun,
  'Cerah': Sun,
  'Cerah Berawan': CloudSun,
  'Berawan': Cloud,
  'Perubahan Cuaca': CloudDrizzle,
  'Hujan Ringan': CloudDrizzle,
  'Hujan': CloudRain,
  'Waspada Badai': CloudLightning,
  'Badai': CloudLightning,
} as const

export function WeatherForecastCard({ readings }: Props) {
  const forecast = forecastWeather(readings)
  if (!forecast) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-medium text-slate-700 dark:text-slate-200">Micro-Weather Forecaster</h2>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Menunggu data tekanan untuk menghitung tren Zambretti.</p>
      </section>
    )
  }

  const Icon = ICON[forecast.label as keyof typeof ICON] ?? Cloud
  const TrendIcon = forecast.trend === 'Rising' ? TrendingUp : forecast.trend === 'Falling' ? TrendingDown : Minus
  const tone = forecast.severity === 'danger'
    ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
    : forecast.severity === 'warn'
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-200">Micro-Weather Forecaster</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Algoritma Zambretti lokal, offline</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{forecast.label}</span>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
          <Icon className="h-8 w-8 text-slate-700 dark:text-slate-200" />
        </div>
        <div>
          <p className="text-2xl font-semibold">{forecast.label}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{forecast.detail}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/40">
          <p className="text-xs text-slate-500 dark:text-slate-400">Tren barometer</p>
          <div className="mt-1 flex items-center gap-2 text-sm font-medium">
            <TrendIcon className="h-4 w-4" /> {forecast.trend}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/40">
          <p className="text-xs text-slate-500 dark:text-slate-400">Laju tekanan</p>
          <p className="mt-1 text-sm font-medium tabular-nums">{forecast.trendHpaPerHour > 0 ? '+' : ''}{forecast.trendHpaPerHour.toFixed(2)} hPa/jam</p>
        </div>
      </div>
    </section>
  )
}
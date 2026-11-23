import { useEffect, useMemo, useRef, useState } from 'react'
import type { SensorReading } from '../types/sensor'

interface Props {
  reading: SensorReading | null
  altitudeOffset?: number
}

export function AltimeterHud({ reading, altitudeOffset = 0 }: Props) {
  const [tareAlt, setTareAlt] = useState<number | null>(null)
  const prevRef = useRef<{ t: number; alt: number } | null>(null)
  const [vspeed, setVspeed] = useState(0)

  useEffect(() => {
    if (!reading) return
    const prev = prevRef.current
    if (prev) {
      const dt = (reading.t - prev.t) / 1000
      if (dt > 0) setVspeed((reading.alt - prev.alt) / dt)
    }
    prevRef.current = { t: reading.t, alt: reading.alt }
  }, [reading])

  const calibratedAlt = reading ? reading.alt + altitudeOffset : null
  const relativeAlt = calibratedAlt !== null ? calibratedAlt - (tareAlt ?? 0) : null
  const ticks = useMemo(() => {
    const base = Math.round((relativeAlt ?? 0) / 10) * 10
    return Array.from({ length: 9 }, (_, i) => base + (4 - i) * 10)
  }, [relativeAlt])

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-200">Cockpit Altimeter HUD</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Pita ketinggian vertikal & kecepatan naik/turun</p>
        </div>
        <button
          type="button"
          onClick={() => setTareAlt(calibratedAlt)}
          disabled={calibratedAlt === null}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
        >
          Tare / Set 0m
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <div className="relative mx-auto h-72 w-full max-w-[180px] overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
          <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-amber-400" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-amber-400 px-2 py-1 text-xs font-bold text-slate-950">
            {relativeAlt !== null ? `${relativeAlt.toFixed(1)} m` : '---'}
          </div>
          {ticks.map((tick) => {
            const offset = ((relativeAlt ?? 0) - tick) * 3
            const top = 144 - offset
            if (top < -20 || top > 308) return null
            return (
              <div key={tick} className="absolute left-0 right-0 flex items-center" style={{ top }}>
                <div className="h-px w-5 bg-slate-500" />
                <span className="ml-2 font-mono text-[11px] text-slate-300">{tick}</span>
              </div>
            )
          })}
        </div>

        <div className="flex flex-col justify-center gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-950/40">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Altitude relatif</p>
            <p className="text-3xl font-semibold tabular-nums">{relativeAlt !== null ? `${relativeAlt.toFixed(1)} m` : 'Menunggu data'}</p>
            {tareAlt !== null && <p className="text-xs text-slate-500 dark:text-slate-400">Tare: {tareAlt.toFixed(1)} m</p>}
            {altitudeOffset !== 0 && <p className="text-xs text-slate-500 dark:text-slate-400">Offset kalibrasi: {altitudeOffset > 0 ? '+' : ''}{altitudeOffset.toFixed(2)} m</p>}
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Kecepatan vertikal</p>
            <p className={`text-2xl font-semibold tabular-nums ${vspeed > 0.2 ? 'text-emerald-600 dark:text-emerald-400' : vspeed < -0.2 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>
              {vspeed > 0 ? '+' : ''}{vspeed.toFixed(2)} m/s
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{vspeed > 0.2 ? 'Naik' : vspeed < -0.2 ? 'Turun' : 'Stabil'}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
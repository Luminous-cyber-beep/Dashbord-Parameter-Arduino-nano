import { useState } from 'react'
import type { SensorReading } from '../types/sensor'

interface Props {
  reading: SensorReading | null
  altitudeOffset?: number
}

type Backlight = 'green' | 'blue'

function formatLine1(reading: SensorReading | null): string {
  if (!reading) return 'T:--.-C ----hPa'
  const t = reading.temp.toFixed(1).padStart(4, ' ')
  const p = Math.round(reading.press).toString().padStart(4, ' ')
  return `T:${t}C ${p}hPa`.slice(0, 16).padEnd(16, ' ')
}

function formatLine2(reading: SensorReading | null, altitudeOffset: number): string {
  if (!reading) return 'Alt:----.- m'
  const alt = (reading.alt + altitudeOffset).toFixed(1).padStart(6, ' ')
  return `Alt:${alt} m`.slice(0, 16).padEnd(16, ' ')
}

const THEMES: Record<Backlight, { bg: string; text: string; glow: string; offBg: string }> = {
  green: { bg: '#8dbf2f', text: '#1f3a12', glow: 'rgba(141,191,47,0.35)', offBg: '#6b7b5c' },
  blue: { bg: '#5aa9d6', text: '#102a43', glow: 'rgba(90,169,214,0.35)', offBg: '#627c8f' },
}

export function VirtualLcd({ reading, altitudeOffset = 0 }: Props) {
  const [backlight, setBacklight] = useState<Backlight>('green')
  const [on, setOn] = useState(true)
  const theme = THEMES[backlight]

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-200">Virtual LCD 16x2</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Tampilan karakter seperti LCD fisik</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={backlight}
            onChange={(e) => setBacklight(e.target.value as Backlight)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="green">Hijau</option>
            <option value="blue">Biru</option>
          </select>
          <button
            type="button"
            onClick={() => setOn((v) => !v)}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
          >
            Backlight: {on ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-sm rounded-xl border-4 border-slate-700 bg-slate-800 p-3">
        <div
          className="rounded-md px-3 py-4 font-mono text-lg leading-8 tracking-[0.18em] sm:text-xl"
          style={{
            backgroundColor: on ? theme.bg : theme.offBg,
            color: on ? theme.text : 'rgba(30,41,59,0.45)',
            boxShadow: on ? `inset 0 0 0 2px rgba(0,0,0,0.15), 0 0 24px ${theme.glow}` : 'inset 0 0 0 2px rgba(0,0,0,0.2)',
            textShadow: on ? '1px 1px 0 rgba(255,255,255,0.15)' : 'none',
          }}
        >
          <div className="whitespace-pre">{formatLine1(reading)}</div>
          <div className="whitespace-pre">{formatLine2(reading, altitudeOffset)}</div>
        </div>
      </div>
    </section>
  )
}
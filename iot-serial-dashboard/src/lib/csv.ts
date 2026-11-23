import type { SensorReading } from '../types/sensor'

export type CsvPreset = 'standar' | 'excel-id'

function formatLocal(epochMs: number): string {
  const d = new Date(epochMs)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatFilenameDate(epochMs: number): string {
  const d = new Date(epochMs)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

export function toCsv(rows: SensorReading[], preset: CsvPreset): string {
  const sep = preset === 'excel-id' ? ';' : ','
  const fmt = (v: number | null) => {
    if (v === null) return ''
    return preset === 'excel-id' ? String(v).replace('.', ',') : String(v)
  }
  const header = ['waktu_lokal', 'epoch_ms', 'suhu_c', 'altitude_m', 'kelembapan_pct', 'tekanan_hpa']
  const body = rows.map((r) =>
    [formatLocal(r.t), r.t, fmt(r.temp), fmt(r.alt), fmt(r.hum), fmt(r.press)].join(sep))
  return [header.join(sep), ...body].join('\r\n')
}

export function downloadCsv(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function csvFilename(now = Date.now()): string {
  return `iot-log-${formatFilenameDate(now)}.csv`
}
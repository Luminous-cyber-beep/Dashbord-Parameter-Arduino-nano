import type { ParsedLine } from '../types/sensor'
import { RANGE } from './constants'

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null

const inRange = (k: keyof typeof RANGE, v: number) => v >= RANGE[k][0] && v <= RANGE[k][1]

export function isBlankLine(raw: string): boolean {
  return raw.trim() === ''
}

export function parseLine(raw: string, now = Date.now()): ParsedLine {
  const line = raw.trim()
  if (line === '') {
    return { kind: 'invalid', reason: 'baris kosong' }
  }
  if (!line.startsWith('{')) {
    return { kind: 'invalid', reason: 'bukan JSON (teks debug atau boot log)' }
  }

  let data: unknown
  try {
    data = JSON.parse(line)
  } catch {
    return { kind: 'invalid', reason: 'JSON terpotong atau tidak valid' }
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { kind: 'invalid', reason: 'bukan objek JSON' }
  }
  const obj = data as Record<string, unknown>

  if ('error' in obj) {
    const message = typeof obj.error === 'string' ? obj.error : 'error tidak dikenal'
    return { kind: 'hw-error', message }
  }

  const temp = num(obj.temp)
  const alt = num(obj.alt)
  const press = num(obj.press)
  if (temp === null || alt === null || press === null) {
    return { kind: 'invalid', reason: 'field temp/alt/press hilang atau bukan angka' }
  }

  let hum: number | null = null
  if ('hum' in obj) {
    hum = num(obj.hum)
    if (hum === null) return { kind: 'invalid', reason: 'hum bukan angka (pembacaan gagal)' }
  }

  let lat: number | null = null
  let lng: number | null = null
  if ('lat' in obj) {
    lat = num(obj.lat)
    if (lat === null || lat < -90 || lat > 90) return { kind: 'invalid', reason: 'lat bukan angka valid' }
  }
  if ('lng' in obj) {
    lng = num(obj.lng)
    if (lng === null || lng < -180 || lng > 180) return { kind: 'invalid', reason: 'lng bukan angka valid' }
  }
  if ((lat === null) !== (lng === null)) {
    return { kind: 'invalid', reason: 'lat/lng harus ada berpasangan' }
  }

  if (!inRange('temp', temp) || !inRange('alt', alt) || !inRange('press', press) ||
      (hum !== null && !inRange('hum', hum))) {
    return { kind: 'invalid', reason: 'nilai di luar rentang fisik sensor' }
  }

  return { kind: 'reading', reading: { t: now, temp, alt, press, hum, lat, lng } }
}

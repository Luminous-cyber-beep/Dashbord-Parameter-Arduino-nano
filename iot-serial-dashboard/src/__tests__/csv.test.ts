import { describe, expect, it } from 'vitest'
import { csvFilename, toCsv } from '../lib/csv'
import type { SensorReading } from '../types/sensor'

const rows: SensorReading[] = [
  { t: 1716451200000, temp: 28.5, alt: 120.4, press: 998.2, hum: 65.2, lat: null, lng: null },
  { t: 1716451201000, temp: 28.6, alt: 120.5, press: 998.3, hum: null, lat: null, lng: null },
]

describe('toCsv', () => {
  it('membuat CSV standar dengan header dan desimal titik', () => {
    const csv = toCsv(rows, 'standar')
    const [header, first, second] = csv.split('\r\n')
    expect(header).toBe('waktu_lokal,epoch_ms,suhu_c,altitude_m,kelembapan_pct,tekanan_hpa')
    expect(first).toContain(',1716451200000,28.5,120.4,65.2,998.2')
    expect(second.endsWith(',998.3')).toBe(true)
    expect(second.split(',')[4]).toBe('')
  })

  it('membuat CSV excel-id dengan pemisah titik koma dan desimal koma', () => {
    const csv = toCsv(rows, 'excel-id')
    const [header, first] = csv.split('\r\n')
    expect(header).toBe('waktu_lokal;epoch_ms;suhu_c;altitude_m;kelembapan_pct;tekanan_hpa')
    expect(first).toContain(';1716451200000;28,5;120,4;65,2;998,2')
  })
})

describe('csvFilename', () => {
  it('membuat nama berkas dengan format log', () => {
    expect(csvFilename(new Date(2026, 4, 23, 14, 5, 6).getTime())).toBe('iot-log-20260523-140506.csv')
  })
})
import { describe, expect, it } from 'vitest'
import { dashboardReducer, createInitialState } from '../hooks/useSensorStore'
import { LIMITS } from '../lib/constants'
import type { SensorReading } from '../types/sensor'

const reading = (t: number, overrides: Partial<SensorReading> = {}): SensorReading => ({
  t,
  temp: 28.5,
  alt: 120.4,
  press: 998.2,
  hum: null,
  lat: null,
  lng: null,
  ...overrides,
})

const bmpLine = '{"temp":28.5,"alt":120.4,"press":998.2}'
const bmeLine = '{"temp":29.5,"hum":65.2,"alt":118.4,"press":997.2}'

describe('dashboardReducer', () => {
  it('mencatat pembacaan BMP280 dari satu baris JSON', () => {
    const state = dashboardReducer(createInitialState(), { type: 'LINE', raw: bmpLine, at: 1000 })

    expect(state.mode).toBe('BMP280')
    expect(state.latest).toEqual(reading(1000))
    expect(state.chartBuffer).toEqual([reading(1000)])
    expect(state.sessionRows).toEqual([reading(1000)])
    expect(state.stats).toEqual({
      temp: { min: 28.5, max: 28.5 },
      alt: { min: 120.4, max: 120.4 },
      press: { min: 998.2, max: 998.2 },
      hum: null,
    })
    expect(state.counters).toEqual({ valid: 1, hwError: 0, invalid: 0, invalidStreak: 0 })
    expect(state.rawLog).toEqual([{ id: 1, t: 1000, text: bmpLine, kind: 'reading' }])
  })

  it('mendeteksi BME280 saat field hum hadir', () => {
    const state = dashboardReducer(createInitialState(), { type: 'LINE', raw: bmeLine, at: 2000 })

    expect(state.mode).toBe('BME280')
    expect(state.latest?.hum).toBe(65.2)
    expect(state.stats.hum).toEqual({ min: 65.2, max: 65.2 })
  })

  it('mencatat baris invalid beserta alasannya', () => {
    const state = dashboardReducer(createInitialState(), {
      type: 'LINE',
      raw: 'boot log',
      at: 3000,
    })

    expect(state.latest).toBeNull()
    expect(state.counters.invalid).toBe(1)
    expect(state.counters.invalidStreak).toBe(1)
    expect(state.rawLog[0]).toMatchObject({
      id: 1,
      kind: 'invalid',
      reason: 'bukan JSON (teks debug atau boot log)',
    })
  })

  it('mengabaikan baris kosong tanpa menyentuh state', () => {
    const initial = createInitialState()
    const state = dashboardReducer(initial, { type: 'LINE', raw: '   ' })
    expect(state).toBe(initial)
  })

  it('menghapus error hardware otomatis setelah pembacaan valid', () => {
    let state = dashboardReducer(createInitialState(), {
      type: 'LINE',
      raw: '{"error":"sensor tidak terdeteksi"}',
      at: 10,
    })
    expect(state.hwError).toEqual({ message: 'sensor tidak terdeteksi', at: 10 })
    expect(state.counters.hwError).toBe(1)

    state = dashboardReducer(state, { type: 'LINE', raw: bmpLine, at: 20 })
    expect(state.hwError).toBeNull()
    expect(state.counters.hwError).toBe(1)
    expect(state.counters.valid).toBe(1)
    expect(state.chartBuffer).toHaveLength(1)
  })

  it('menghitung ulang invalidStreak dan menaikkan counter invalid', () => {
    let state = createInitialState()
    for (let i = 0; i < 3; i += 1) {
      state = dashboardReducer(state, { type: 'LINE', raw: 'acak', at: i })
    }
    expect(state.counters).toMatchObject({ invalid: 3, invalidStreak: 3 })

    state = dashboardReducer(state, { type: 'LINE', raw: bmpLine, at: 10 })
    expect(state.counters.invalidStreak).toBe(0)
    expect(state.counters.invalid).toBe(3)
  })

  it('membatasi chartBuffer sesuai LIMITS', () => {
    let state = createInitialState()
    for (let i = 1; i <= LIMITS.CHART_BUFFER; i += 1) {
      state = dashboardReducer(state, { type: 'READING', reading: reading(i) })
    }
    state = dashboardReducer(state, { type: 'READING', reading: reading(999) })

    expect(state.chartBuffer).toHaveLength(LIMITS.CHART_BUFFER)
    expect(state.chartBuffer[0].t).toBe(2)
    expect(state.chartBuffer.at(-1)?.t).toBe(999)
  })

  it('membatasi sessionRows dan menandai baris tertua dibuang', () => {
    const full = {
      ...createInitialState(),
      sessionRows: Array.from({ length: LIMITS.SESSION_ROWS }, (_, i) => reading(i + 1)),
    }
    const state = dashboardReducer(full, { type: 'READING', reading: reading(99_999) })

    expect(state.sessionRows).toHaveLength(LIMITS.SESSION_ROWS)
    expect(state.sessionRows[0].t).toBe(2)
    expect(state.sessionRows.at(-1)?.t).toBe(99_999)
    expect(state.sessionTruncated).toBe(true)
  })

  it('membatasi raw log ke 200 baris terakhir', () => {
    let state = createInitialState()
    for (let i = 1; i <= LIMITS.RAW_LOG_LINES + 5; i += 1) {
      state = dashboardReducer(state, { type: 'LINE', raw: `log ${i}`, at: i })
    }

    expect(state.rawLog).toHaveLength(LIMITS.RAW_LOG_LINES)
    expect(state.rawLog[0].id).toBe(6)
    expect(state.rawLog.at(-1)?.id).toBe(205)
  })

  it('memotong teks raw log yang terlalu panjang', () => {
    const state = dashboardReducer(createInitialState(), {
      type: 'LINE',
      raw: 'x'.repeat(600),
      at: 1,
    })
    expect(state.rawLog[0].text).toHaveLength(500)
  })

  it('memperbarui Min/Max secara inkremental dan mengabaikan hum null', () => {
    let state = dashboardReducer(createInitialState(), {
      type: 'READING',
      reading: reading(1, { temp: 30, hum: null }),
    })
    state = dashboardReducer(state, {
      type: 'READING',
      reading: reading(2, { temp: 27, hum: 70 }),
    })
    state = dashboardReducer(state, {
      type: 'READING',
      reading: reading(3, { temp: 35, hum: 60 }),
    })

    expect(state.stats.temp).toEqual({ min: 27, max: 35 })
    expect(state.stats.hum).toEqual({ min: 60, max: 70 })
  })

  it('mode mengikuti pembacaan terbaru saat sensor diganti', () => {
    let state = dashboardReducer(createInitialState(), {
      type: 'READING',
      reading: reading(1, { hum: 65 }),
    })
    state = dashboardReducer(state, { type: 'READING', reading: reading(2, { hum: null }) })
    expect(state.mode).toBe('BMP280')
    expect(state.latest?.hum).toBeNull()
  })

  it('menutup banner error manual dan menghapus raw log', () => {
    let state = dashboardReducer(createInitialState(), {
      type: 'HW_ERROR',
      message: 'gagal',
      at: 1,
    })
    state = dashboardReducer(state, { type: 'LINE', raw: 'log', at: 2 })
    state = dashboardReducer(state, { type: 'DISMISS_HW_ERROR' })
    state = dashboardReducer(state, { type: 'CLEAR_RAW_LOG' })

    expect(state.hwError).toBeNull()
    expect(state.rawLog).toEqual([])
    expect(state.counters.hwError).toBe(1)
  })

  it('mengosongkan seluruh sesi saat reset', () => {
    let state = dashboardReducer(createInitialState(), { type: 'LINE', raw: bmpLine, at: 1 })
    state = dashboardReducer(state, { type: 'RESET_SESSION' })
    expect(state).toEqual(createInitialState())
  })
})

import { describe, expect, it } from 'vitest'
import { isBlankLine, parseLine } from '../lib/parser'

const validBmp = '{"temp":28.5,"alt":120.4,"press":998.2}'
const validBme = '{"temp":28.5,"hum":65.2,"alt":120.4,"press":998.2}'

describe('parseLine', () => {
  it('mengabaikan baris kosong', () => {
    expect(isBlankLine('')).toBe(true)
    expect(isBlankLine('   ')).toBe(true)
    expect(isBlankLine(validBmp)).toBe(false)
    expect(parseLine('')).toEqual({ kind: 'invalid', reason: 'baris kosong' })
  })

  it('menolak baris yang tidak diawali kurung kurawal', () => {
    expect(parseLine('boot: sensor ready')).toEqual({
      kind: 'invalid',
      reason: 'bukan JSON (teks debug atau boot log)',
    })
  })

  it('menolak JSON yang terpotong', () => {
    expect(parseLine('{"temp":28.5')).toEqual({
      kind: 'invalid',
      reason: 'JSON terpotong atau tidak valid',
    })
  })

  it('menolak JSON bukan objek', () => {
    expect(parseLine('[1,2,3]').kind).toBe('invalid')
    expect(parseLine('42').kind).toBe('invalid')
    expect(parseLine('null').kind).toBe('invalid')
  })

  it('mengenali paket error hardware', () => {
    expect(parseLine('{"error":"sensor tidak terdeteksi"}', 10)).toEqual({
      kind: 'hw-error',
      message: 'sensor tidak terdeteksi',
    })
  })

  it('memakai pesan default untuk error bukan string', () => {
    expect(parseLine('{"error":123}')).toEqual({
      kind: 'hw-error',
      message: 'error tidak dikenal',
    })
  })

  it.each(['{"alt":120.4,"press":998.2}', '{"temp":null,"alt":120.4,"press":998.2}',
    '{"temp":"28.5","alt":120.4,"press":998.2}', '{"temp":28.5,"alt":120.4}'])(
    'menolak field wajib yang hilang atau bukan angka: %s', (line) => {
      expect(parseLine(line)).toEqual({
        kind: 'invalid',
        reason: 'field temp/alt/press hilang atau bukan angka',
      })
    },
  )

  it('menolak token nan dan infinity', () => {
    for (const line of ['{"temp":NaN,"alt":120.4,"press":998.2}',
      '{"temp":28.5,"alt":Infinity,"press":998.2}']) {
      expect(parseLine(line).kind).toBe('invalid')
    }
  })

  it('membaca payload BMP280 dengan hum null', () => {
    expect(parseLine(validBmp, 1234)).toEqual({
      kind: 'reading',
      reading: { t: 1234, temp: 28.5, alt: 120.4, press: 998.2, hum: null, lat: null, lng: null },
    })
  })

  it('membaca payload BME280 dengan hum berupa angka', () => {
    expect(parseLine(validBme, 5678)).toEqual({
      kind: 'reading',
      reading: { t: 5678, temp: 28.5, alt: 120.4, press: 998.2, hum: 65.2, lat: null, lng: null },
    })
  })

  it('membaca payload dengan lat/lng opsional', () => {
    expect(parseLine('{"temp":28.5,"alt":120.4,"press":998.2,"lat":-6.2,"lng":106.816666}', 9)).toEqual({
      kind: 'reading',
      reading: { t: 9, temp: 28.5, alt: 120.4, press: 998.2, hum: null, lat: -6.2, lng: 106.816666 },
    })
  })

  it('menolak lat/lng tidak lengkap atau tidak valid', () => {
    expect(parseLine('{"temp":28.5,"alt":120.4,"press":998.2,"lat":-6.2}').kind).toBe('invalid')
    expect(parseLine('{"temp":28.5,"alt":120.4,"press":998.2,"lat":-91,"lng":106}').kind).toBe('invalid')
  })

  it.each(['{"temp":28.5,"alt":120.4,"press":998.2,"hum":null}',
    '{"temp":28.5,"alt":120.4,"press":998.2,"hum":"abc"}'])(
    'menolak hum bukan angka: %s', (line) => {
      expect(parseLine(line)).toEqual({
        kind: 'invalid',
        reason: 'hum bukan angka (pembacaan gagal)',
      })
    },
  )

  it.each(['{"temp":90,"alt":120.4,"press":998.2}',
    '{"temp":28.5,"alt":10000,"press":998.2}',
    '{"temp":28.5,"alt":120.4,"press":200}',
    '{"temp":28.5,"alt":120.4,"press":998.2,"hum":101}'])(
    'menolak nilai di luar rentang fisik: %s', (line) => {
      expect(parseLine(line)).toEqual({
        kind: 'invalid',
        reason: 'nilai di luar rentang fisik sensor',
      })
    },
  )

  it('menerima nilai di batas rentang fisik', () => {
    expect(parseLine('{"temp":-40,"alt":-500,"press":300}').kind).toBe('reading')
    expect(parseLine('{"temp":85,"alt":9000,"press":1100,"hum":100}').kind).toBe('reading')
  })

  it('memakai Date.now sebagai cap waktu bawaan', () => {
    const before = Date.now()
    const result = parseLine(validBmp)
    const after = Date.now()
    if (result.kind !== 'reading') throw new Error('seharusnya reading')
    expect(result.reading.t).toBeGreaterThanOrEqual(before)
    expect(result.reading.t).toBeLessThanOrEqual(after)
  })
})

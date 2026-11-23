import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_THRESHOLDS } from '../lib/constants'
import { classify, isValidRange, loadThresholds, normalizeThresholds, saveThresholds, THRESHOLDS_STORAGE_KEY } from '../lib/thresholds'

function createStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() { return store.size },
    clear() { store.clear() },
    getItem(key: string) { return store.get(key) ?? null },
    key(index: number) { return Array.from(store.keys())[index] ?? null },
    removeItem(key: string) { store.delete(key) },
    setItem(key: string, value: string) { store.set(key, value) },
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: createStorage(), configurable: true, writable: true })
})

afterEach(() => {
  localStorage.removeItem(THRESHOLDS_STORAGE_KEY)
})

describe('classify', () => {
  it('mengembalikan none bila semua batas null', () => {
    expect(classify(120, { warnMin: null, warnMax: null, dangerMin: null, dangerMax: null })).toBe('none')
  })

  it('mendeteksi danger sebelum warning', () => {
    const range = { warnMin: 18, warnMax: 33, dangerMin: 10, dangerMax: 38 }
    expect(classify(39, range)).toBe('danger')
    expect(classify(9, range)).toBe('danger')
  })

  it('mendeteksi warning dan normal', () => {
    const range = { warnMin: 18, warnMax: 33, dangerMin: 10, dangerMax: 38 }
    expect(classify(34, range)).toBe('warning')
    expect(classify(17, range)).toBe('warning')
    expect(classify(25, range)).toBe('normal')
  })
})

describe('isValidRange', () => {
  it('menerima urutan batas yang valid', () => {
    expect(isValidRange({ dangerMin: 10, warnMin: 18, warnMax: 33, dangerMax: 38 })).toBe(true)
  })

  it('menolak urutan yang terbalik', () => {
    expect(isValidRange({ dangerMin: 20, warnMin: 10, warnMax: 33, dangerMax: 38 })).toBe(false)
    expect(isValidRange({ dangerMin: 10, warnMin: 18, warnMax: 33, dangerMax: 30 })).toBe(false)
  })
})

describe('threshold storage', () => {
  it('memuat default saat kosong', () => {
    expect(loadThresholds()).toEqual(DEFAULT_THRESHOLDS)
  })

  it('default suhu memberi peringatan di atas 35C', () => {
    expect(DEFAULT_THRESHOLDS.temp.warnMax).toBe(35)
    expect(classify(35.1, DEFAULT_THRESHOLDS.temp)).toBe('warning')
  })

  it('menggabungkan data rusak dengan default', () => {
    localStorage.setItem(THRESHOLDS_STORAGE_KEY, '{broken')
    expect(loadThresholds()).toEqual(DEFAULT_THRESHOLDS)
  })

  it('menormalkan field yang hilang', () => {
    const normalized = normalizeThresholds({ temp: { warnMin: 1, warnMax: 2, dangerMin: 0, dangerMax: 3 } })
    expect(normalized.temp.warnMin).toBe(1)
    expect(normalized.alt).toEqual(DEFAULT_THRESHOLDS.alt)
  })

  it('menyimpan dan memuat ulang', () => {
    const next = { ...DEFAULT_THRESHOLDS, temp: { ...DEFAULT_THRESHOLDS.temp, warnMax: 30 } }
    saveThresholds(next)
    expect(loadThresholds()).toEqual(next)
  })
})
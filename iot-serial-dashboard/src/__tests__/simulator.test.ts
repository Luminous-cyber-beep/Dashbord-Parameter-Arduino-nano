import { describe, expect, it } from 'vitest'
import { getSimScenario, startSimulator, type SimScenario } from '../dev/simulator'
import { parseLine } from '../lib/parser'

describe('simulator', () => {
  it('membaca skenario dari query string', () => {
    expect(getSimScenario('?sim=bme280')).toBe('bme280')
    expect(getSimScenario('?sim=error')).toBe('error')
    expect(getSimScenario('?sim=unknown')).toBeNull()
    expect(getSimScenario('')).toBeNull()
  })

  it.each<[SimScenario, string]>([
    ['bmp280', 'reading'],
    ['bme280', 'reading'],
    ['error', 'hw-error'],
    ['noisy', 'reading'],
  ])('menghasilkan baris yang bisa diproses pada skenario %s', (scenario, expectedKind) => {
    const lines: string[] = []
    const stop = startSimulator(scenario, (line) => { lines.push(line) })
    stop()

    expect(lines.length).toBeGreaterThan(0)
    expect(lines[0].length).toBeGreaterThan(12)
    const kinds = lines.map((line) => parseLine(line).kind)
    expect(kinds).toContain(expectedKind)
    if (scenario === 'noisy') expect(kinds).toContain('invalid')
  })
})

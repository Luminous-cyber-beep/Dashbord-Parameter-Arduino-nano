import { LIMITS } from '../lib/constants'
import { LineBreakTransformer } from '../lib/lineBreakTransformer'

export type SimScenario = 'bmp280' | 'bme280' | 'error' | 'noisy'

const SCENARIOS: readonly SimScenario[] = ['bmp280', 'bme280', 'error', 'noisy']

export function getSimScenario(search = window.location.search): SimScenario | null {
  if (!import.meta.env.DEV) return null
  const value = new URLSearchParams(search).get('sim')
  return SCENARIOS.find((scenario) => scenario === value) ?? null
}

const fmt = (value: number) => value.toFixed(1)

function readingLine(mode: 'bmp280' | 'bme280', t: number): string {
  const phase = t / 7_000
  const temp = 28 + Math.sin(phase) * 2 + (Math.random() - 0.5) * 0.4
  const press = 1_000 + Math.cos(phase) * 4 + (Math.random() - 0.5) * 0.6
  const alt = 120 + (press - 1_000) * 8
  const hum = 65 + Math.sin(phase * 0.7) * 5 + (Math.random() - 0.5)
  const lat = -6.2 + Math.sin(phase / 20) * 0.0002
  const lng = 106.816666 + Math.cos(phase / 20) * 0.0002
  const fields = `"temp":${fmt(temp)},"alt":${fmt(alt)},"press":${fmt(press)},"lat":${lat.toFixed(6)},"lng":${lng.toFixed(6)}`
  return mode === 'bme280' ? `{${fields},"hum":${fmt(hum)}}` : `{${fields}}`
}

function tickLines(scenario: SimScenario, t: number): string {
  const lines: string[] = []
  if (scenario === 'error') {
    lines.push('{"error":"sensor tidak terdeteksi"}')
  } else if (scenario === 'noisy') {
    lines.push('Booting... BMP280 init')
    lines.push('{"temp":28.5,"alt":')
    lines.push('{"temp":nan,"alt":120.4,"press":998.2}')
    lines.push('{"temp":120,"alt":120.4,"press":998.2}')
    lines.push(readingLine('bme280', t))
    if (Math.random() < 0.2) lines.push('x'.repeat(LIMITS.MAX_LINE_CHARS + 5))
  } else {
    lines.push(readingLine(scenario, t))
  }
  return `${lines.join('\n')}\n`
}

export function startSimulator(scenario: SimScenario, onLine: (line: string) => void): () => void {
  const transformer = new LineBreakTransformer()
  const controller = { enqueue: onLine } as unknown as TransformStreamDefaultController<string>
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const emit = (text: string) => {
    let offset = 0
    while (offset < text.length && !stopped) {
      const size = 1 + Math.floor(Math.random() * 12)
      transformer.transform(text.slice(offset, offset + size), controller)
      offset += size
    }
  }

  const tick = () => {
    if (stopped) return
    emit(tickLines(scenario, Date.now()))
    timer = globalThis.setTimeout(tick, 1000)
  }

  tick()
  return () => {
    stopped = true
    if (timer !== undefined) globalThis.clearTimeout(timer)
  }
}

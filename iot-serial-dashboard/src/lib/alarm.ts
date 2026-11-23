export type AlarmMode = 'piezo' | 'siren'

type ActiveAlarm = {
  mode: AlarmMode
  volume: number
  oscillators: OscillatorNode[]
  gains: GainNode[]
  timers: number[]
  master: GainNode
}

let audioContext: AudioContext | null = null
let activeAlarm: ActiveAlarm | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!audioContext) audioContext = new Ctor()
  return audioContext
}

export async function unlockAudio(): Promise<boolean> {
  const ctx = getContext()
  if (!ctx) return false
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      return false
    }
  }
  return true
}

function clampVolume(volume: number): number {
  if (!Number.isFinite(volume)) return 0.8
  return Math.min(1, Math.max(0, volume))
}

function peakFor(volume: number): number {
  return 0.04 + clampVolume(volume) * 0.56
}

function stopActive(): void {
  if (!activeAlarm) return
  for (const timer of activeAlarm.timers) window.clearInterval(timer)
  for (const osc of activeAlarm.oscillators) {
    try { osc.stop() } catch { /* already stopped */ }
    try { osc.disconnect() } catch { /* ignore */ }
  }
  for (const gain of activeAlarm.gains) {
    try { gain.disconnect() } catch { /* ignore */ }
  }
  try { activeAlarm.master.disconnect() } catch { /* ignore */ }
  activeAlarm = null
}

function startPiezo(ctx: AudioContext, master: GainNode, volume: number): ActiveAlarm {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const peak = peakFor(volume)
  osc.type = 'square'
  osc.frequency.value = 2850
  gain.gain.value = 0.0001
  osc.connect(gain)
  gain.connect(master)
  osc.start()

  let on = false
  const timer = window.setInterval(() => {
    on = !on
    const t = ctx.currentTime
    gain.gain.cancelScheduledValues(t)
    gain.gain.setTargetAtTime(on ? peak : 0.0001, t, 0.005)
  }, 120)

  return { mode: 'piezo', volume, oscillators: [osc], gains: [gain], timers: [timer], master }
}

function startSiren(ctx: AudioContext, master: GainNode, volume: number): ActiveAlarm {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const peak = peakFor(volume)
  osc.type = 'sawtooth'
  gain.gain.value = peak
  osc.connect(gain)
  gain.connect(master)
  osc.start()

  const cycleMs = 1000
  const minFreq = 650
  const maxFreq = 1600
  const startAt = performance.now()
  const tick = () => {
    const elapsed = (performance.now() - startAt) % cycleMs
    const phase = elapsed / cycleMs
    const tri = phase < 0.5 ? phase * 2 : (1 - phase) * 2
    osc.frequency.setTargetAtTime(minFreq + (maxFreq - minFreq) * tri, ctx.currentTime, 0.02)
  }
  tick()
  const timer = window.setInterval(tick, 30)

  return { mode: 'siren', volume, oscillators: [osc], gains: [gain], timers: [timer], master }
}

export async function startContinuousAlarm(mode: AlarmMode, volume = 0.8): Promise<void> {
  const ok = await unlockAudio()
  if (!ok) return
  const ctx = getContext()
  if (!ctx) return
  const v = clampVolume(volume)

  if (activeAlarm && activeAlarm.mode === mode) {
    activeAlarm.volume = v
    activeAlarm.master.gain.setTargetAtTime(v, ctx.currentTime, 0.03)
    return
  }

  stopActive()
  const master = ctx.createGain()
  master.gain.value = v
  master.connect(ctx.destination)
  activeAlarm = mode === 'piezo' ? startPiezo(ctx, master, v) : startSiren(ctx, master, v)
}

export function setAlarmVolume(volume: number): void {
  const v = clampVolume(volume)
  if (!activeAlarm || !audioContext) return
  activeAlarm.volume = v
  activeAlarm.master.gain.setTargetAtTime(v, audioContext.currentTime, 0.03)
}

export function stopAlarm(): void {
  stopActive()
}

export function isAlarmPlaying(): boolean {
  return activeAlarm !== null
}

export async function playAlarm(mode: AlarmMode, volume = 0.8): Promise<void> {
  await startContinuousAlarm(mode, volume)
}

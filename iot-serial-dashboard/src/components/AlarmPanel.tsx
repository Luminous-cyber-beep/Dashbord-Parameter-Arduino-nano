import { BellRing, Volume2, VolumeX } from 'lucide-react'
import { startContinuousAlarm, stopAlarm, unlockAudio, type AlarmMode } from '../lib/alarm'

interface Props {
  mode: AlarmMode
  thresholdC: number
  volume: number
  muted: boolean
  active: boolean
  currentTemp: number | null
  onModeChange: (mode: AlarmMode) => void
  onThresholdChange: (value: number) => void
  onVolumeChange: (value: number) => void
  onMuteToggle: () => void
}

export function AlarmPanel({ mode, thresholdC, volume, muted, active, currentTemp, onModeChange, onThresholdChange, onVolumeChange, onMuteToggle }: Props) {
  const testSound = async () => {
    await unlockAudio()
    await startContinuousAlarm(mode, volume)
    window.setTimeout(() => { if (!active) stopAlarm() }, 3000)
  }

  return (
    <section className={`rounded-2xl border p-4 shadow-sm ${active ? 'border-red-300 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-200">Alarm Suhu</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Web Audio API sintetis, tanpa file audio eksternal</p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium ${active ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
          <BellRing className="h-3.5 w-3.5" /> {active ? 'AKTIF' : 'Standby'}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-slate-500 dark:text-slate-400">
          Batas suhu bahaya (°C)
          <input
            type="number"
            value={thresholdC}
            onChange={(e) => onThresholdChange(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            min={0}
            step={0.5}
          />
        </label>

        <label className="text-xs text-slate-500 dark:text-slate-400">
          Mode suara
          <select
            value={mode}
            onChange={(e) => onModeChange(e.target.value as AlarmMode)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="piezo">Piezo Buzzer</option>
            <option value="siren">Fire Alarm Siren</option>
          </select>
        </label>

        <label className="text-xs text-slate-500 dark:text-slate-400">
          Volume alarm: {Math.round(volume * 100)}%
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
            className="mt-3 w-full"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => { void testSound() }} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white">
          <Volume2 className="h-4 w-4" /> Test Sound
        </button>
        <button type="button" onClick={onMuteToggle} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">
          <VolumeX className="h-4 w-4" /> {muted ? 'Unmute' : 'Mute / Acknowledge'}
        </button>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Suhu saat ini: {currentTemp !== null ? `${currentTemp.toFixed(1)} °C` : '—'}
        </span>
      </div>

      {active && muted && (
        <p className="mt-3 text-xs text-red-700 dark:text-red-300">Suara dibungkam, tetapi alarm visual tetap aktif sampai suhu kembali normal.</p>
      )}
    </section>
  )
}
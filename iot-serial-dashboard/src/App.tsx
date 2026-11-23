import { useCallback, useEffect, useMemo, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { BrowserSupportGate } from './components/BrowserSupportGate'
import { AlarmPanel } from './components/AlarmPanel'
import { AltimeterHud } from './components/AltimeterHud'
import { ChartGrid } from './components/ChartGrid'
import { ConnectionBar } from './components/ConnectionBar'
import { ExportButton } from './components/ExportButton'
import { HardwareErrorBanner } from './components/HardwareErrorBanner'
import { KpiGrid } from './components/KpiGrid'
import { LocationPanel } from './components/LocationPanel'
import { RawSerialDrawer } from './components/RawSerialDrawer'
import { ThresholdAlertStrip } from './components/ThresholdAlertStrip'
import { ThresholdSettings } from './components/ThresholdSettings'
import { VirtualLcd } from './components/VirtualLcd'
import { WeatherForecastCard } from './components/WeatherForecastCard'
import { getSimScenario, startSimulator } from './dev/simulator'
import { startContinuousAlarm, stopAlarm, unlockAudio, type AlarmMode } from './lib/alarm'
import { useNow } from './hooks/useNow'
import { useSensorStore } from './hooks/useSensorStore'
import { useTheme } from './hooks/useTheme'
import { useThresholds } from './hooks/useThresholds'
import { useWebSerial } from './hooks/useWebSerial'

const BAUD_STORAGE_KEY = 'iot-dashboard:v1:baud'
const WINDOW_OPTIONS = [30_000, 60_000] as const

function readBaud(): number {
  try {
    const raw = localStorage.getItem(BAUD_STORAGE_KEY)
    return raw === '9600' ? 9600 : 115200
  } catch {
    return 115200
  }
}

export default function App() {
  const { state, dispatch } = useSensorStore()
  const [baudRate, setBaudRate] = useState(readBaud)
  const [windowMs, setWindowMs] = useState<number>(60_000)
  const [simStatus, setSimStatus] = useState<'idle' | 'connected' | 'disconnected'>('idle')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [alarmMode, setAlarmMode] = useState<AlarmMode>('piezo')
  const [alarmThresholdC, setAlarmThresholdC] = useState(35)
  const [alarmVolume, setAlarmVolume] = useState(0.8)
  const [alarmMuted, setAlarmMuted] = useState(false)
  const [altitudeOffset, setAltitudeOffset] = useState(0)
  const simScenario = useMemo(() => getSimScenario(), [])
  const now = useNow(1000)
  const { theme, toggleTheme } = useTheme()
  const { thresholds, updateThresholds, resetThresholds } = useThresholds()

  const onLine = useCallback((line: string) => {
    dispatch({ type: 'LINE', raw: line })
  }, [dispatch])

  const serial = useWebSerial(onLine)

  useEffect(() => {
    if (!simScenario) return
    return startSimulator(simScenario, onLine)
  }, [onLine, simScenario])

  const alarmActive = (state.latest?.temp ?? -Infinity) >= alarmThresholdC

  const effectiveMuted = alarmMuted && alarmActive

  useEffect(() => {
    if (!alarmActive || effectiveMuted) {
      stopAlarm()
      return
    }
    void startContinuousAlarm(alarmMode, alarmVolume)
  }, [alarmActive, alarmMode, alarmVolume, effectiveMuted])



  useEffect(() => () => stopAlarm(), [])

  const handleBaudChange = (value: number) => {
    setBaudRate(value)
    try {
      localStorage.setItem(BAUD_STORAGE_KEY, String(value))
    } catch {
      // localStorage mungkin tidak tersedia
    }
  }

  const status = simScenario ? (simStatus === 'idle' ? 'connected' : simStatus) : serial.status
  const error = simScenario ? null : serial.error
  const portInfo = simScenario ? { vid: 0, pid: 0 } : serial.portInfo
  const reconnectAvailable = simScenario ? false : serial.reconnectAvailable

  return (
    <BrowserSupportGate>
      <main className="min-h-screen bg-slate-100 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:p-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">IoT Serial Dashboard</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Monitoring sensor lokal lewat Web Serial API. Alarm suara sintetis aktif saat suhu melewati batas bahaya.
                {simScenario ? ` Mode simulasi: ${simScenario}.` : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-300 p-1 dark:border-slate-700">
                {WINDOW_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setWindowMs(option)}
                    className={`rounded-md px-3 py-1.5 text-sm ${windowMs === option ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-600 dark:text-slate-300'}`}
                  >
                    {option / 1000}s
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setSettingsOpen(true)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">Ambang</button>
              <ExportButton rows={state.sessionRows} />
              <button
                type="button"
                onClick={() => { if (window.confirm('Reset sesi? Data grafik, KPI, dan log CSV sesi akan dikosongkan.')) dispatch({ type: 'RESET_SESSION' }) }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700"
              >
                Reset sesi
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700"
                aria-label="Toggle tema"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
            </div>
          </header>

          <ConnectionBar
            status={status}
            error={error}
            portInfo={portInfo}
            baudRate={baudRate}
            invalidStreak={state.counters.invalidStreak}
            reconnectAvailable={reconnectAvailable}
            onBaudRateChange={handleBaudChange}
            onConnect={() => {
              if (simScenario) {
                setSimStatus('connected')
                return
              }
              void serial.connect(baudRate)
            }}
            onDisconnect={() => {
              if (simScenario) {
                setSimStatus('disconnected')
                return
              }
              void serial.disconnect()
            }}
            onReconnect={() => {
              void serial.reconnect(baudRate)
            }}
          />

          {state.hwError && <HardwareErrorBanner message={state.hwError.message} onDismiss={() => dispatch({ type: 'DISMISS_HW_ERROR' })} />}
          <ThresholdAlertStrip reading={state.latest} thresholds={thresholds} />
          {state.sessionTruncated && (
            <p className="rounded-xl bg-amber-100 px-4 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              Log CSV penuh, baris tertua dibuang.
            </p>
          )}

          <KpiGrid state={state} now={now} thresholds={thresholds} />

          <section className="grid gap-4 xl:grid-cols-2">
            <VirtualLcd reading={state.latest} altitudeOffset={altitudeOffset} />
            <AltimeterHud reading={state.latest} altitudeOffset={altitudeOffset} />
          </section>

          <LocationPanel reading={state.latest} altitudeOffset={altitudeOffset} onCalibrateAltitude={setAltitudeOffset} />

          <section className="grid gap-4 xl:grid-cols-2">
            <WeatherForecastCard readings={state.sessionRows} />
            <AlarmPanel
              mode={alarmMode}
              thresholdC={alarmThresholdC}
              volume={alarmVolume}
              muted={effectiveMuted}
              active={alarmActive}
              currentTemp={state.latest?.temp ?? null}
              onModeChange={setAlarmMode}
              onThresholdChange={(value) => setAlarmThresholdC(Number.isFinite(value) ? value : 35)}
              onVolumeChange={setAlarmVolume}
              onMuteToggle={() => { void unlockAudio(); setAlarmMuted((v) => !v) }}
            />
          </section>

          <ChartGrid state={state} windowMs={windowMs} thresholds={thresholds} />
          <RawSerialDrawer entries={state.rawLog} counters={state.counters} onClear={() => dispatch({ type: 'CLEAR_RAW_LOG' })} />

          <ThresholdSettings
            open={settingsOpen}
            thresholds={thresholds}
            onClose={() => setSettingsOpen(false)}
            onSave={updateThresholds}
            onReset={resetThresholds}
          />
        </div>
      </main>
    </BrowserSupportGate>
  )
}

import { LIMITS } from '../lib/constants'
import { formatPortInfo } from '../lib/usbChips'
import type { SerialPortInfoState, SerialStatus } from '../hooks/useWebSerial'

const BAUD_RATES = [115200, 9600] as const

interface Props {
  status: SerialStatus
  error: string | null
  portInfo: SerialPortInfoState | null
  baudRate: number
  invalidStreak: number
  reconnectAvailable: boolean
  onBaudRateChange: (baudRate: number) => void
  onConnect: () => void
  onDisconnect: () => void
  onReconnect: () => void
}

const statusLabel: Record<SerialStatus, string> = {
  idle: 'Disconnected',
  connecting: 'Connecting...',
  connected: 'Connected',
  disconnecting: 'Disconnecting...',
  disconnected: 'Disconnected',
  error: 'Error',
}

const statusClass: Record<SerialStatus, string> = {
  idle: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  connecting: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  connected: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  disconnecting: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  disconnected: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

export function ConnectionBar({
  status,
  error,
  portInfo,
  baudRate,
  invalidStreak,
  reconnectAvailable,
  onBaudRateChange,
  onConnect,
  onDisconnect,
  onReconnect,
}: Props) {
  const busy = status === 'connecting' || status === 'disconnecting'
  const connected = status === 'connected'
  const portLabel = formatPortInfo(portInfo)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onConnect}
            disabled={busy || connected}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Connect USB
          </button>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            Baud
            <select
              value={baudRate}
              onChange={(event) => onBaudRateChange(Number(event.target.value))}
              disabled={connected}
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              {BAUD_RATES.map((rate) => (
                <option key={rate} value={rate}>{rate}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={onDisconnect}
            disabled={!connected || busy}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
          >
            Disconnect
          </button>
          {reconnectAvailable && !connected && (
            <button
              type="button"
              onClick={onReconnect}
              disabled={busy}
              className="rounded-lg border border-sky-300 px-4 py-2 text-sm font-medium text-sky-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-700 dark:text-sky-300"
            >
              Reconnect
            </button>
          )}
        </div>

        <div
          className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-sm ${statusClass[status]}`}
          aria-live="polite"
        >
          <span className="h-2 w-2 rounded-full bg-current" />
          <span>
            {statusLabel[status]}
            {connected ? ` [${portLabel}] ${baudRate} baud` : ''}
            {status === 'error' && error ? `: ${error}` : ''}
          </span>
        </div>
      </div>

      {error && status !== 'error' && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {invalidStreak >= LIMITS.INVALID_STREAK_HINT && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Banyak baris tidak valid. Periksa baud rate dan format JSON firmware.
        </p>
      )}
    </section>
  )
}

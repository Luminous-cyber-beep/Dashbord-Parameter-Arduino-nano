import type { LucideIcon } from 'lucide-react'
import { LIMITS } from '../lib/constants'
import { formatLocalTime, formatRelativeSeconds } from '../lib/format'
import type { ThresholdStatus } from '../types/sensor'

interface Props {
  title: string
  unit: string
  icon: LucideIcon
  value: number | null
  digits?: number
  status: ThresholdStatus
  min: number | null
  max: number | null
  updatedAt: number | null
  now: number
  waiting: boolean
  na?: boolean
  naLabel?: string
  naHint?: string
  note?: string
  tooltip?: string
}

const STATUS_LABEL: Record<ThresholdStatus, string> = {
  normal: 'Normal',
  warning: 'Waspada',
  danger: 'Bahaya',
  none: 'Tanpa ambang',
}

const STATUS_CLASS: Record<ThresholdStatus, string> = {
  normal: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  none: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

function formatValue(value: number, digits: number): string {
  return value.toLocaleString('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export function KpiCard({
  title, unit, icon: Icon, value, digits = 1, status, min, max, updatedAt, now, waiting,
  na = false, naLabel = 'N/A', naHint, note, tooltip,
}: Props) {
  const stale = updatedAt !== null && now - updatedAt > LIMITS.STALE_AFTER_MS
  const displayStatus = na ? 'none' : status
  const badge = stale && !na ? 'Tertunda' : STATUS_LABEL[displayStatus]

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <Icon className="h-4 w-4" aria-hidden="true" />
          <h2 className="text-sm font-medium">{title}</h2>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${stale && !na ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' : STATUS_CLASS[displayStatus]}`}>
          {badge}
        </span>
      </div>

      {waiting ? (
        <div className="mt-4 animate-pulse">
          <div className="h-8 w-28 rounded bg-slate-200 dark:bg-slate-700" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Menunggu data</p>
        </div>
      ) : na ? (
        <div className="mt-4">
          <p className="text-2xl font-semibold text-slate-500 dark:text-slate-400">{naLabel}</p>
          {naHint && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{naHint}</p>}
        </div>
      ) : (
        <>
          <p className={`mt-4 text-3xl font-semibold tabular-nums ${stale ? 'text-slate-400 dark:text-slate-500' : ''}`}>
            {value !== null ? `${formatValue(value, digits)} ${unit}` : '—'}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Min {min !== null ? formatValue(min, digits) : '—'} · Max {max !== null ? formatValue(max, digits) : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {updatedAt !== null ? `Update ${formatLocalTime(updatedAt)} (${formatRelativeSeconds(updatedAt, now)})` : 'Belum ada pembaruan'}
          </p>
        </>
      )}

      {note && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400" title={tooltip}>
          {note}
        </p>
      )}
    </article>
  )
}

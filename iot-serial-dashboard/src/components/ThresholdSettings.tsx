import { useState } from 'react'
import { DEFAULT_THRESHOLDS, DISPLAY_METRIC_KEYS } from '../lib/constants'
import { isValidRange, metricLabel } from '../lib/thresholds'
import type { ThresholdRange, Thresholds } from '../types/sensor'

interface Props {
  open: boolean
  thresholds: Thresholds
  onClose: () => void
  onSave: (next: Thresholds) => boolean
  onReset: () => void
}

type Draft = Record<string, Record<keyof ThresholdRange, string>>

function toDraft(thresholds: Thresholds): Draft {
  const draft: Draft = {}
  for (const key of DISPLAY_METRIC_KEYS) {
    const r = thresholds[key]
    draft[key] = {
      warnMin: r.warnMin?.toString() ?? '',
      warnMax: r.warnMax?.toString() ?? '',
      dangerMin: r.dangerMin?.toString() ?? '',
      dangerMax: r.dangerMax?.toString() ?? '',
    }
  }
  return draft
}

function fromDraft(draft: Draft): { thresholds: Thresholds; error: string | null } {
  const next = { ...DEFAULT_THRESHOLDS } as Thresholds
  for (const key of DISPLAY_METRIC_KEYS) {
    const raw = draft[key]
    const parsed: ThresholdRange = { warnMin: null, warnMax: null, dangerMin: null, dangerMax: null }
    for (const field of ['warnMin', 'warnMax', 'dangerMin', 'dangerMax'] as const) {
      const text = raw[field].trim()
      if (text === '') {
        parsed[field] = null
        continue
      }
      const num = Number(text)
      if (!Number.isFinite(num)) return { thresholds: DEFAULT_THRESHOLDS, error: `${metricLabel(key)}: ${field} harus angka.` }
      parsed[field] = num
    }
    if (!isValidRange(parsed)) {
      return { thresholds: DEFAULT_THRESHOLDS, error: `${metricLabel(key)}: urutan harus dangerMin <= warnMin <= warnMax <= dangerMax.` }
    }
    next[key] = parsed
  }
  return { thresholds: next, error: null }
}

const FIELDS: Array<{ key: keyof ThresholdRange; label: string }> = [
  { key: 'warnMin', label: 'warnMin' },
  { key: 'warnMax', label: 'warnMax' },
  { key: 'dangerMin', label: 'dangerMin' },
  { key: 'dangerMax', label: 'dangerMax' },
]

export function ThresholdSettings({ open, thresholds, onClose, onSave, onReset }: Props) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(thresholds))
  const [error, setError] = useState<string | null>(null)
  const [prevOpen, setPrevOpen] = useState(open)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setDraft(toDraft(thresholds))
      setError(null)
    }
  }

  if (!open) return null

  const save = () => {
    const parsed = fromDraft(draft)
    if (parsed.error) {
      setError(parsed.error)
      return
    }
    const ok = onSave(parsed.thresholds)
    if (!ok) {
      setError('Ambang tidak valid.')
      return
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Pengaturan Ambang</h2>
          <button type="button" onClick={onClose} className="rounded-md border px-2 py-1 text-sm dark:border-slate-700">Tutup</button>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Kosongkan kolom untuk menonaktifkan batas tersebut.</p>

        <div className="mt-4 space-y-4">
          {DISPLAY_METRIC_KEYS.map((key) => (
            <div key={key} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="mb-2 text-sm font-medium">{metricLabel(key)}</p>
              <div className="grid gap-2 sm:grid-cols-4">
                {FIELDS.map((field) => (
                  <label key={field.key} className="text-xs text-slate-500 dark:text-slate-400">
                    {field.label}
                    <input
                      value={draft[key][field.key]}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [key]: { ...prev[key], [field.key]: e.target.value } }))}
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      inputMode="decimal"
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={save} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white">Simpan</button>
          <button type="button" onClick={() => { onReset(); onClose() }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700">Kembalikan default</button>
        </div>
      </div>
    </div>
  )
}
import { useState } from 'react'
import { csvFilename, downloadCsv, toCsv, type CsvPreset } from '../lib/csv'
import type { SensorReading } from '../types/sensor'

interface Props {
  rows: SensorReading[]
}

export function ExportButton({ rows }: Props) {
  const [preset, setPreset] = useState<CsvPreset>('standar')
  const disabled = rows.length === 0

  return (
    <div className="flex items-center gap-2">
      <select
        value={preset}
        onChange={(e) => setPreset(e.target.value as CsvPreset)}
        disabled={disabled}
        className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950"
        aria-label="Format CSV"
      >
        <option value="standar">CSV standar</option>
        <option value="excel-id">Excel Indonesia</option>
      </select>
      <button
        type="button"
        disabled={disabled}
        onClick={() => downloadCsv(toCsv(rows, preset), csvFilename())}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700"
      >
        Export CSV
      </button>
    </div>
  )
}
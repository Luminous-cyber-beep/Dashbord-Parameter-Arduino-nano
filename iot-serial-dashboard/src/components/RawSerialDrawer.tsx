import { useEffect, useRef, useState } from 'react'
import { formatLocalTime } from '../lib/format'
import type { RawLogEntry } from '../types/sensor'

interface Props {
  entries: RawLogEntry[]
  counters: { valid: number; hwError: number; invalid: number }
  onClear: () => void
}

const KIND_CLASS: Record<RawLogEntry['kind'], string> = {
  reading: 'text-slate-700 dark:text-slate-300',
  'hw-error': 'text-red-700 dark:text-red-400',
  invalid: 'text-amber-700 dark:text-amber-400',
}

export function RawSerialDrawer({ entries, counters, onClear }: Props) {
  const [open, setOpen] = useState(false)
  const [paused, setPaused] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const bodyRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open || paused || !autoScroll) return
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [entries, open, paused, autoScroll])

  const onScroll = () => {
    const el = bodyRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24
    if (!nearBottom) setAutoScroll(false)
  }

  const copy = async () => {
    const text = entries.map((e) => `[${formatLocalTime(e.t)}] ${e.text}${e.reason ? ` (${e.reason})` : ''}`).join('\n')
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // abaikan jika clipboard tidak tersedia
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{open ? 'v' : '>'} RAW SERIAL MONITOR</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          valid {counters.valid} / error {counters.hwError} / invalid {counters.invalid}
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="mb-3 flex flex-wrap gap-2">
            <button type="button" className="rounded-md border px-2 py-1 text-xs dark:border-slate-700" onClick={() => setPaused((v) => !v)}>{paused ? 'Resume' : 'Pause'}</button>
            <button type="button" className="rounded-md border px-2 py-1 text-xs dark:border-slate-700" onClick={() => setAutoScroll((v) => !v)}>{autoScroll ? 'Auto-scroll on' : 'Auto-scroll off'}</button>
            <button type="button" className="rounded-md border px-2 py-1 text-xs dark:border-slate-700" onClick={onClear}>Clear</button>
            <button type="button" className="rounded-md border px-2 py-1 text-xs dark:border-slate-700" onClick={() => { void copy() }}>Copy</button>
          </div>
          <div ref={bodyRef} onScroll={onScroll} className="max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-xs">
            {entries.length === 0 ? (
              <p className="text-slate-500">Belum ada data serial.</p>
            ) : entries.map((entry) => (
              <div key={entry.id} className={KIND_CLASS[entry.kind]}>
                <span className="text-slate-500">[{formatLocalTime(entry.t)}]</span> {entry.text}
                {entry.reason ? <span className="text-slate-500"> — {entry.reason}</span> : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
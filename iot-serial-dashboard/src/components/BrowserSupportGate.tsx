import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export function BrowserSupportGate({ children }: Props) {
  const supported = 'serial' in navigator

  if (supported) return <>{children}</>

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Browser tidak didukung</p>
        <h1 className="mt-2 text-2xl font-semibold">Web Serial API tidak tersedia</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Dashboard ini membutuhkan browser berbasis Chromium dengan Web Serial API. Buka lewat
          <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">http://localhost</code>
          di Chrome atau Edge. Firefox dan Safari belum mendukung Web Serial.
        </p>
      </section>
    </main>
  )
}

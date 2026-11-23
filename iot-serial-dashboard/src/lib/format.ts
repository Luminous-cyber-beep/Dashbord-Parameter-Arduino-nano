export function formatLocalTime(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString('id-ID', { hour12: false })
}

export function formatRelativeSeconds(epochMs: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - epochMs) / 1000))
  return `${seconds} dtk lalu`
}

export function formatMetricValue(value: number | null, digits = 1): string {
  if (value === null) return 'N/A'
  return value.toLocaleString('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

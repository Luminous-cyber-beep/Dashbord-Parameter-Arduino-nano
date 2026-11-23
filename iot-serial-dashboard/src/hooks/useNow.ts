import { useEffect, useState } from 'react'

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = globalThis.setInterval(() => setNow(Date.now()), intervalMs)
    return () => globalThis.clearInterval(id)
  }, [intervalMs])

  return now
}

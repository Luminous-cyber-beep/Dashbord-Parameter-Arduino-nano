import { useEffect, useState } from 'react'
import type { LocationPoint } from '../lib/location'

interface GeolocationState {
  point: LocationPoint | null
  error: string | null
  supported: boolean
}

export function useGeolocation(): GeolocationState {
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator
  const [point, setPoint] = useState<LocationPoint | null>(null)
  const [error, setError] = useState<string | null>(supported ? null : 'Geolocation tidak didukung browser ini.')

  useEffect(() => {
    if (!supported) return
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPoint({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
          source: 'browser',
          timestamp: pos.timestamp,
        })
        setError(null)
      },
      (err) => {
        setError(err.message || 'Gagal mendapatkan lokasi browser.')
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [supported])

  return { point, error, supported }
}
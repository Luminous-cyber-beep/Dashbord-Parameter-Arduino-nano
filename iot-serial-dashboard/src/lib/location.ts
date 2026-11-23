export type LocationSource = 'browser' | 'hardware' | 'manual'
export type MapsStatus = 'idle' | 'loading' | 'ready' | 'error' | 'missing-key'

export interface LocationPoint {
  lat: number
  lng: number
  accuracy: number | null
  source: LocationSource
  timestamp: number
}

export interface GeocodeAddress {
  formatted: string
  street: string
  village: string
  district: string
  city: string
  province: string
  postalCode: string
}

const GOOGLE_SCRIPT_ID = 'google-maps-js'
const AUTH_FAILURE_MESSAGE = 'Google Maps API key tidak valid, API belum diaktifkan, kuota habis, atau domain hosting belum diizinkan.'
let googleMapsPromise: Promise<void> | null = null
let authFailureMessage: string | null = null
const authFailureListeners = new Set<(message: string) => void>()

type GoogleMapsWindow = Window & {
  google?: { maps?: unknown }
  gm_authFailure?: () => void
}

function publishAuthFailure(): void {
  authFailureMessage = AUTH_FAILURE_MESSAGE
  authFailureListeners.forEach((listener) => listener(AUTH_FAILURE_MESSAGE))
}

export function onGoogleMapsAuthFailure(listener: (message: string) => void): () => void {
  authFailureListeners.add(listener)
  if (authFailureMessage) listener(authFailureMessage)
  return () => authFailureListeners.delete(listener)
}

export function getGoogleMapsApiKey(): string {
  return (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() ?? ''
}

export function loadGoogleMapsApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window tidak tersedia'))
  if (authFailureMessage) return Promise.reject(new Error(authFailureMessage))
  if ((window as GoogleMapsWindow).google?.maps) return Promise.resolve()
  if (googleMapsPromise) return googleMapsPromise

  const key = getGoogleMapsApiKey()
  if (!key) return Promise.reject(new Error('MISSING_KEY'))

  const mapsWindow = window as GoogleMapsWindow
  if (!mapsWindow.gm_authFailure) mapsWindow.gm_authFailure = publishAuthFailure

  googleMapsPromise = new Promise<void>((resolve, reject) => {
    const settleLoad = () => {
      if (authFailureMessage) reject(new Error(authFailureMessage))
      else resolve()
    }
    const existing = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', settleLoad, { once: true })
      existing.addEventListener('error', () => reject(new Error('Gagal memuat Google Maps JS API')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = GOOGLE_SCRIPT_ID
    script.async = true
    script.defer = true
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`
    script.onload = settleLoad
    script.onerror = () => reject(new Error('Gagal memuat Google Maps JS API'))
    document.head.appendChild(script)
  })

  return googleMapsPromise
}

function component(components: google.maps.GeocoderAddressComponent[], type: string): string {
  return components.find((c) => c.types.includes(type))?.long_name ?? ''
}

export async function reverseGeocode(point: Pick<LocationPoint, 'lat' | 'lng'>): Promise<GeocodeAddress> {
  await loadGoogleMapsApi()
  const geocoder = new google.maps.Geocoder()
  const response = await geocoder.geocode({ location: { lat: point.lat, lng: point.lng } })
  const result = response.results[0]
  const components = result?.address_components ?? []
  const streetNumber = component(components, 'street_number')
  const route = component(components, 'route')
  const street = [route, streetNumber].filter(Boolean).join(' ').trim()
  return {
    formatted: result?.formatted_address ?? 'Alamat tidak ditemukan',
    street,
    village: component(components, 'administrative_area_level_4') || component(components, 'sublocality_level_1') || component(components, 'sublocality'),
    district: component(components, 'administrative_area_level_3'),
    city: component(components, 'administrative_area_level_2') || component(components, 'locality'),
    province: component(components, 'administrative_area_level_1'),
    postalCode: component(components, 'postal_code'),
  }
}

export async function fetchElevation(point: Pick<LocationPoint, 'lat' | 'lng'>): Promise<number> {
  const key = getGoogleMapsApiKey()
  if (!key) throw new Error('MISSING_KEY')
  const url = `https://maps.googleapis.com/maps/api/elevation/json?locations=${point.lat},${point.lng}&key=${encodeURIComponent(key)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Elevation API HTTP ${res.status}`)
  const json = await res.json() as { status?: string; error_message?: string; results?: Array<{ elevation?: number }> }
  if (json.status !== 'OK' || !json.results?.[0] || typeof json.results[0].elevation !== 'number') {
    throw new Error(json.error_message || json.status || 'Elevation tidak tersedia')
  }
  return json.results[0].elevation
}
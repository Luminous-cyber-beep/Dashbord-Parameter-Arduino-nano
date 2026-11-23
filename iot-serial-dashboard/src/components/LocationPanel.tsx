import { useEffect, useMemo, useRef, useState } from 'react'
import { Crosshair, MapPin, Mountain, Satellite } from 'lucide-react'
import { useGeolocation } from '../hooks/useGeolocation'
import { fetchElevation, getGoogleMapsApiKey, loadGoogleMapsApi, onGoogleMapsAuthFailure, reverseGeocode, type GeocodeAddress, type LocationPoint, type MapsStatus } from '../lib/location'
import type { SensorReading } from '../types/sensor'

interface Props {
  reading: SensorReading | null
  altitudeOffset: number
  onCalibrateAltitude: (nextOffset: number) => void
}

type MapMode = 'roadmap' | 'satellite' | 'hybrid'

function fmtCoord(value: number): string {
  return value.toFixed(6)
}

export function LocationPanel({ reading, altitudeOffset, onCalibrateAltitude }: Props) {
  const { point: browserPoint, error: geoError } = useGeolocation()
  const [manualPoint, setManualPoint] = useState<LocationPoint | null>(null)
  const [mapsStatus, setMapsStatus] = useState<MapsStatus>(() => getGoogleMapsApiKey() ? 'loading' : 'missing-key')
  const [mapsError, setMapsError] = useState<string | null>(null)
  const [address, setAddress] = useState<GeocodeAddress | null>(null)
  const [geocodeError, setGeocodeError] = useState<string | null>(null)
  const [elevation, setElevation] = useState<number | null>(null)
  const [elevationError, setElevationError] = useState<string | null>(null)
  const [elevationLoading, setElevationLoading] = useState(false)
  const [mapMode, setMapMode] = useState<MapMode>('roadmap')
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapObj = useRef<google.maps.Map | null>(null)
  const markerObj = useRef<google.maps.Marker | null>(null)
  const circleObj = useRef<google.maps.Circle | null>(null)
  const geocodeTimer = useRef<number | null>(null)

  const hardwarePoint = useMemo<LocationPoint | null>(() => {
    if (!reading || reading.lat === null || reading.lng === null) return null
    return { lat: reading.lat, lng: reading.lng, accuracy: null, source: 'hardware', timestamp: reading.t }
  }, [reading])

  const activePoint = hardwarePoint ?? manualPoint ?? browserPoint

  useEffect(() => {
    const root = document.documentElement
    const update = () => setIsDark(root.classList.contains('dark'))
    update()
    const obs = new MutationObserver(update)
    obs.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const key = getGoogleMapsApiKey()
    if (!key) return
    let cancelled = false
    loadGoogleMapsApi()
      .then(() => { if (!cancelled) { setMapsStatus('ready'); setMapsError(null) } })
      .catch((err: unknown) => { if (!cancelled) { setMapsStatus('error'); setMapsError(err instanceof Error ? err.message : 'Gagal memuat Google Maps') } })
    return () => { cancelled = true }
  }, [])

  const hardwarePointRef = useRef<LocationPoint | null>(null)
  useEffect(() => { hardwarePointRef.current = hardwarePoint }, [hardwarePoint])
  const initialPointRef = useRef<LocationPoint | null>(activePoint)
  useEffect(() => {
    return onGoogleMapsAuthFailure((message) => {
      setMapsStatus('error')
      setMapsError(message)
    })
  }, [])
  useEffect(() => {
    if (mapsStatus !== 'ready' || !mapRef.current || mapObj.current) return
    const initial = initialPointRef.current
    const center = initial ? { lat: initial.lat, lng: initial.lng } : { lat: -6.2, lng: 106.816666 }
    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: initial ? 16 : 5,
      mapTypeId: mapMode,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
    })
    const marker = new google.maps.Marker({
      position: center,
      map,
      draggable: true,
      title: 'Titik telemetry',
    })
    const circle = new google.maps.Circle({
      map,
      center,
      radius: initial?.accuracy ?? 0,
      visible: Boolean(initial?.accuracy),
      strokeColor: '#0ea5e9',
      strokeOpacity: 0.8,
      strokeWeight: 1,
      fillColor: '#0ea5e9',
      fillOpacity: 0.15,
    })
    marker.setDraggable(!hardwarePointRef.current)
    marker.addListener('dragend', () => {
      const pos = marker.getPosition()
      if (!pos || hardwarePointRef.current) return
      setManualPoint({ lat: pos.lat(), lng: pos.lng(), accuracy: null, source: 'manual', timestamp: Date.now() })
    })
    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng || hardwarePointRef.current) return
      setManualPoint({ lat: e.latLng.lat(), lng: e.latLng.lng(), accuracy: null, source: 'manual', timestamp: Date.now() })
    })
    mapObj.current = map
    markerObj.current = marker
    circleObj.current = circle
  }, [mapsStatus, activePoint, mapMode])

  useEffect(() => {
    const map = mapObj.current
    if (!map) return
    map.setMapTypeId(mapMode)
  }, [mapMode])

  useEffect(() => {
    const map = mapObj.current
    if (!map) return
    const darkStyle: google.maps.MapTypeStyle[] = [
      { elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#1f2937' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#374151' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
    ]
    map.setOptions({ styles: isDark && mapMode === 'roadmap' ? darkStyle : [] })
  }, [isDark, mapMode])

  const activeLat = activePoint?.lat
  const activeLng = activePoint?.lng
  const activeAccuracy = activePoint?.accuracy ?? null
  const activeSource = activePoint?.source
  useEffect(() => {
    if (activeLat === undefined || activeLng === undefined || !mapObj.current || !markerObj.current || !circleObj.current) return
    const pos = { lat: activeLat, lng: activeLng }
    markerObj.current.setPosition(pos)
    markerObj.current.setDraggable(!hardwarePointRef.current)
    mapObj.current.panTo(pos)
    circleObj.current.setCenter(pos)
    circleObj.current.setRadius(activeAccuracy ?? 0)
    circleObj.current.setVisible(Boolean(activeAccuracy && activeSource === 'browser'))
  }, [activeLat, activeLng, activeAccuracy, activeSource])

  useEffect(() => {
    if (activeLat === undefined || activeLng === undefined || mapsStatus !== 'ready') return
    const point = { lat: activeLat, lng: activeLng }
    if (geocodeTimer.current) window.clearTimeout(geocodeTimer.current)
    geocodeTimer.current = window.setTimeout(() => {
      reverseGeocode(point)
        .then((res) => { setAddress(res); setGeocodeError(null) })
        .catch((err: unknown) => { setGeocodeError(err instanceof Error ? err.message : 'Reverse geocoding gagal') })
    }, 700)
    return () => { if (geocodeTimer.current) window.clearTimeout(geocodeTimer.current) }
  }, [activeLat, activeLng, mapsStatus])

  const calibrate = async () => {
    if (!activePoint || !reading) return
    setElevationLoading(true)
    try {
      const elev = await fetchElevation(activePoint)
      setElevation(elev)
      setElevationError(null)
      onCalibrateAltitude(elev - reading.alt)
    } catch (err) {
      setElevationError(err instanceof Error ? err.message : 'Gagal mengambil elevasi')
    } finally {
      setElevationLoading(false)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-200">Precise Location & Telemetry Map</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Prioritas: hardware lat/lng → manual pin → browser geolocation; geocoding & elevasi</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['roadmap', 'satellite', 'hybrid'] as MapMode[]).map((mode) => (
            <button key={mode} type="button" onClick={() => setMapMode(mode)} className={`rounded-md px-2 py-1 text-xs ${mapMode === mode ? 'bg-sky-600 text-white' : 'border border-slate-300 dark:border-slate-700'}`}>
              {mode === 'roadmap' ? 'Peta' : mode === 'satellite' ? 'Satelit' : 'Hybrid'}
            </button>
          ))}
        </div>
      </div>

      {mapsStatus === 'missing-key' && (
        <div className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          `VITE_GOOGLE_MAPS_API_KEY` belum diisi. Tambahkan key di `.env` lalu restart dev server agar peta, geocoding, dan elevasi aktif.
        </div>
      )}
      {mapsStatus === 'error' && (
        <div className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300">
          Gagal memuat Google Maps: {mapsError}. Cek API key, izin Maps JavaScript API, billing/kuota, atau referrer domain.
        </div>
      )}
      {geoError && <div className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">Geolocation browser: {geoError}</div>}

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
          {mapsStatus === 'ready' ? (
            <div ref={mapRef} className="h-80 w-full" />
          ) : (
            <div className="flex h-80 items-center justify-center bg-slate-100 p-6 text-center text-sm text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
              Peta akan tampil setelah Google Maps JS API siap.
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/40">
            <div className="flex items-center gap-2 text-sm font-medium"><MapPin className="h-4 w-4" /> Koordinat aktif</div>
            {activePoint ? (
              <div className="mt-2 space-y-1 text-sm">
                <p className="font-mono tabular-nums">{fmtCoord(activePoint.lat)}, {fmtCoord(activePoint.lng)}</p>
                <p className="text-slate-500 dark:text-slate-400">Sumber: {activePoint.source === 'hardware' ? 'Hardware GPS (serial)' : activePoint.source === 'manual' ? 'Manual pin/drag' : 'Browser geolocation'}</p>
                <p className="text-slate-500 dark:text-slate-400">Akurasi: {activePoint.accuracy ? `±${activePoint.accuracy.toFixed(1)} m` : 'N/A'}</p>
                {hardwarePoint && <p className="text-xs text-slate-500 dark:text-slate-400">Lokasi hardware serial mengunci titik aktif. Pin manual tersedia bila payload lat/lng tidak dikirim.</p>}
              </div>
            ) : <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Menunggu koordinat hardware/manual/browser.</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={!browserPoint || Boolean(hardwarePoint)} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700" onClick={() => { if (browserPoint) setManualPoint(null) }}>
                <Crosshair className="h-3.5 w-3.5" /> Gunakan browser
              </button>
              {manualPoint && !hardwarePoint && <button type="button" className="rounded-md border px-2 py-1 text-xs dark:border-slate-700" onClick={() => setManualPoint(null)}>Hapus pin manual</button>}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/40">
            <div className="flex items-center gap-2 text-sm font-medium"><Satellite className="h-4 w-4" /> Alamat (Reverse Geocoding)</div>
            {geocodeError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{geocodeError}</p>}
            {address ? (
              <div className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                <p className="font-medium text-slate-800 dark:text-slate-100">{address.formatted}</p>
                <p>Jalan/Area: {address.street || '-'}</p>
                <p>Kelurahan/Desa: {address.village || '-'}</p>
                <p>Kecamatan: {address.district || '-'}</p>
                <p>Kota/Kabupaten: {address.city || '-'}</p>
                <p>Provinsi: {address.province || '-'}</p>
                <p>Kode Pos: {address.postalCode || '-'}</p>
              </div>
            ) : <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Alamat akan muncul saat koordinat dan Geocoding API tersedia.</p>}
          </div>

          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/40">
            <div className="flex items-center gap-2 text-sm font-medium"><Mountain className="h-4 w-4" /> Kalibrasi Elevasi</div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Offset altitude saat ini: {altitudeOffset.toFixed(2)} m</p>
            {elevation !== null && <p className="text-sm text-slate-500 dark:text-slate-400">Elevasi Google: {elevation.toFixed(2)} mdpl</p>}
            {elevationError && <p className="text-xs text-red-600 dark:text-red-400">{elevationError}</p>}
            <button type="button" onClick={() => { void calibrate() }} disabled={!activePoint || !reading || elevationLoading || mapsStatus === 'missing-key'} className="mt-3 rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50">
              {elevationLoading ? 'Mengambil elevasi...' : 'Kalibrasi ke Elevasi Google'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
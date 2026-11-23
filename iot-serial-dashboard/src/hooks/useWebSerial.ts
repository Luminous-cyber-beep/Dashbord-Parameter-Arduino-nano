import { useCallback, useEffect, useRef, useState } from 'react'
import { LineBreakTransformer } from '../lib/lineBreakTransformer'
import { mapSerialError } from '../lib/serialErrors'

export type SerialStatus = 'idle' | 'connecting' | 'connected' | 'disconnecting' | 'disconnected' | 'error'
export interface SerialPortInfoState {
  vid?: number
  pid?: number
}

export function useWebSerial(onLine: (line: string) => void) {
  const portRef = useRef<SerialPort | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null)
  const loopRef = useRef<Promise<void> | null>(null)
  const keepReadingRef = useRef(false)
  const onLineRef = useRef(onLine)
  useEffect(() => {
    onLineRef.current = onLine
  })

  const [status, setStatus] = useState<SerialStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [portInfo, setPortInfo] = useState<SerialPortInfoState | null>(null)
  const [reconnectAvailable, setReconnectAvailable] = useState(false)

  const readLoop = useCallback(async (port: SerialPort) => {
    while (port.readable && keepReadingRef.current) {
      const decoder = new TextDecoderStream()
      const closed = port.readable.pipeTo(decoder.writable as unknown as WritableStream<Uint8Array>).catch(() => {})
      const reader = decoder.readable.pipeThrough(new TransformStream(new LineBreakTransformer())).getReader()
      readerRef.current = reader
      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          if (value !== undefined && value.trim() !== '') onLineRef.current(value)
        }
      } catch {
        // loop luar memutuskan dari kondisi port.readable
      } finally {
        reader.releaseLock()
        readerRef.current = null
        await closed
      }
    }
    if (keepReadingRef.current) {
      keepReadingRef.current = false
      portRef.current = null
      setStatus('disconnected')
      setError('Perangkat terputus. Sambungkan kembali kabel USB.')
    }
  }, [])

  const connectToPort = useCallback(async (port: SerialPort, baudRate: number) => {
    await port.open({ baudRate })
    portRef.current = port
    const info = port.getInfo()
    setPortInfo({ vid: info.usbVendorId, pid: info.usbProductId })
    setReconnectAvailable(false)
    setError(null)
    keepReadingRef.current = true
    setStatus('connected')
    loopRef.current = readLoop(port)
  }, [readLoop])

  const connect = useCallback(async (baudRate: number) => {
    if (!('serial' in navigator)) {
      setStatus('error')
      setError('Browser ini tidak mendukung Web Serial API.')
      return
    }
    setError(null)
    setStatus('connecting')
    try {
      const port = await navigator.serial.requestPort()
      await connectToPort(port, baudRate)
    } catch (e) {
      const mapped = mapSerialError(e)
      setStatus(mapped ? 'error' : 'idle')
      setError(mapped?.message ?? null)
    }
  }, [connectToPort])

  const disconnect = useCallback(async () => {
    setStatus('disconnecting')
    keepReadingRef.current = false
    try {
      await readerRef.current?.cancel()
    } catch {
      // reader sudah tertutup
    }
    try {
      await loopRef.current
    } catch {
      // diabaikan
    }
    try {
      await portRef.current?.close()
    } catch {
      // port sudah tertutup
    }
    portRef.current = null
    setStatus('disconnected')
  }, [])

  const reconnect = useCallback(async (baudRate: number) => {
    if (!('serial' in navigator)) return
    setError(null)
    setStatus('connecting')
    try {
      const ports = await navigator.serial.getPorts()
      const port = ports.find((candidate) => {
        const info = candidate.getInfo()
        return !portInfo?.vid || (info.usbVendorId === portInfo.vid && info.usbProductId === portInfo.pid)
      }) ?? ports[0]
      if (!port) {
        setStatus('disconnected')
        setError('Port yang pernah diizinkan tidak ditemukan. Klik Connect USB untuk memilih port.')
        return
      }
      await connectToPort(port, baudRate)
    } catch (e) {
      const mapped = mapSerialError(e)
      setStatus(mapped ? 'error' : 'disconnected')
      setError(mapped?.message ?? 'Gagal menyambung ulang port.')
    }
  }, [connectToPort, portInfo])

  useEffect(() => {
    if (!('serial' in navigator)) return

    const onDisconnect = (event: Event) => {
      const serialEvent = event as SerialConnectionEvent
      if (serialEvent.port !== portRef.current) return
      keepReadingRef.current = false
      portRef.current = null
      setStatus('disconnected')
      setError('Perangkat terputus. Sambungkan kembali kabel USB.')
      setReconnectAvailable(true)
    }

    const onConnect = (event: Event) => {
      const serialEvent = event as SerialConnectionEvent
      if (portRef.current) return
      const info = serialEvent.port.getInfo()
      if (!portInfo?.vid || (info.usbVendorId === portInfo.vid && info.usbProductId === portInfo.pid)) {
        setReconnectAvailable(true)
      }
    }

    navigator.serial.addEventListener('disconnect', onDisconnect)
    navigator.serial.addEventListener('connect', onConnect)
    return () => {
      navigator.serial.removeEventListener('disconnect', onDisconnect)
      navigator.serial.removeEventListener('connect', onConnect)
    }
  }, [portInfo])

  useEffect(() => {
    return () => {
      keepReadingRef.current = false
      void readerRef.current?.cancel().catch(() => {})
      void portRef.current?.close().catch(() => {})
    }
  }, [])

  return { status, error, portInfo, reconnectAvailable, connect, disconnect, reconnect }
}

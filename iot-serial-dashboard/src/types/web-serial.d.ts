export {}

declare global {
  interface Navigator {
    serial: Serial
  }

  interface Serial extends EventTarget {
    requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>
    getPorts(): Promise<SerialPort[]>
    addEventListener(type: 'connect' | 'disconnect', listener: (event: SerialConnectionEvent) => void): void
    removeEventListener(type: 'connect' | 'disconnect', listener: (event: SerialConnectionEvent) => void): void
  }

  interface SerialPortRequestOptions {
    filters?: SerialPortFilter[]
  }

  interface SerialPortFilter {
    usbVendorId?: number
    usbProductId?: number
  }

  interface SerialPort extends EventTarget {
    readonly readable: ReadableStream<Uint8Array> | null
    readonly writable: WritableStream<Uint8Array> | null
    open(options: SerialOptions): Promise<void>
    close(): Promise<void>
    getInfo(): SerialPortInfo
    addEventListener(type: 'connect' | 'disconnect', listener: (event: Event) => void): void
    removeEventListener(type: 'connect' | 'disconnect', listener: (event: Event) => void): void
  }

  interface SerialOptions {
    baudRate: number
    dataBits?: 7 | 8
    stopBits?: 1 | 2
    parity?: 'none' | 'even' | 'odd'
    bufferSize?: number
    flowControl?: 'none' | 'hardware'
  }

  interface SerialPortInfo {
    usbVendorId?: number
    usbProductId?: number
  }

  interface SerialConnectionEvent extends Event {
    readonly port: SerialPort
  }
}

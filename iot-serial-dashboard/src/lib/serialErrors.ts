export interface SerialError {
  code: string
  message: string
}

export function mapSerialError(e: unknown): SerialError | null {
  if (e instanceof DOMException) {
    switch (e.name) {
      case 'NotFoundError':
        return null
      case 'InvalidStateError':
        return { code: 'already-open', message: 'Port sudah terbuka di halaman ini. Klik Disconnect, lalu coba lagi.' }
      case 'NetworkError':
        return {
          code: 'busy',
          message:
            'Port tidak bisa dibuka. Tutup Serial Monitor Arduino IDE, PuTTY, atau tab dashboard lain yang memakai port ini. Di Linux, pastikan akun masuk grup dialout.',
        }
      case 'SecurityError':
        return { code: 'security', message: 'Akses serial diblokir. Buka dashboard lewat http://localhost di Chrome atau Edge.' }
    }
  }
  return { code: 'unknown', message: e instanceof Error ? e.message : 'Gagal membuka port.' }
}

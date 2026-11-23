const KNOWN_CHIPS: Record<number, string> = {
  0x2341: 'Arduino',
  0x1a86: 'CH340/CH341',
  0x10c4: 'CP210x',
  0x0403: 'FTDI',
  0x303a: 'Espressif',
}

export function formatPortInfo(info: { vid?: number; pid?: number } | null): string {
  if (!info?.vid) return 'USB'
  const vid = info.vid.toString(16).toUpperCase().padStart(4, '0')
  const pid = info.pid?.toString(16).toUpperCase().padStart(4, '0')
  const chip = KNOWN_CHIPS[info.vid]
  const id = pid ? `${vid}:${pid}` : vid
  return chip ? `USB ${id}, ${chip}` : `USB ${id}`
}

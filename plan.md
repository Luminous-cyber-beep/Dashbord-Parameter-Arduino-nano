# Plan: Real-Time USB Serial IoT Monitoring Dashboard (Local + Hosting)

| Item | Keputusan |
|---|---|
| Mode | Local-first untuk serial; siap production build dan hosting HTTPS (Vercel/Netlify/static host). Tetap tanpa backend aplikasi sendiri |
| Sumber data | Web Serial API (`navigator.serial`) untuk `temp, alt, press, hum` opsional; Browser Geolocation API; payload serial opsional `lat,lng` |
| Stack | Vite + React + TypeScript, Tailwind CSS, Recharts, `localStorage`, Web Audio API, Google Maps Platform |
| Browser target | Chrome atau Edge desktop (Firefox dan Safari tidak mendukung Web Serial). Geolocation/Maps butuh izin browser |
| Sensor | BMP280/BME280; firmware boleh menambah `"lat":...,"lng":...` |
| API eksternal | Google Maps JavaScript API, Geocoding API, Elevation API (butuh `VITE_GOOGLE_MAPS_API_KEY`) |

---

## 1. Project Overview & Hardware-to-Web Flow

### 1.1 Ringkasan sistem

Dashboard satu halaman membaca JSON dari mikrokontroler lewat kabel USB, memproses telemetry di browser, menampilkan KPI/grafik, Virtual LCD 16x2, Altimeter HUD, Zambretti forecast, alarm Web Audio, dan peta/lokasi via Google Maps Platform. Tidak ada backend aplikasi; hosting bersifat static HTTPS. Permintaan jaringan keluar hanya ke Google Maps/Geocoding/Elevation saat fitur lokasi aktif dan API key tersedia.

Alur ringkas:

```
BMP280/BME280 (+opsional GPS) -> MCU JSON -> USB Web Serial -> Parser/Reducer -> UI
Browser Geolocation (watchPosition) -----> Location resolver (hardware > manual > browser)
Google Maps JS + Geocoding + Elevation -> Map, alamat, kalibrasi elevasi
```

### 1.2 Diagram alur data

```
[BMP280 / BME280]
      | I2C (alamat 0x76 atau 0x77)
      v
[Mikrokontroler]  1 baris JSON per 1000 ms, diakhiri "\n"
      | USB (COM Port, 115200 baud)
      v
[port.readable : ReadableStream<Uint8Array>]
      | TextDecoderStream
      v
[LineBreakTransformer : tampung sampai "\n"]
      | satu string per baris lengkap
      +-------------------------+
      v                         v
[Raw log, maks 200 baris]   [parseLine : JSON.parse + validasi]
                                | reading | hw-error | invalid
                                v
                      [Reducer -> React state]
          chartBuffer (maks 120) | sessionRows (maks 20.000) | stats Min/Max
                                v
      [UI : KPI cards, grafik, banner error, drawer raw log, Export CSV]
```

### 1.3 Batasan platform dan hosting

- **Dukungan browser.** Web Serial hanya ada di browser berbasis Chromium. Jika `'serial' in navigator` bernilai `false`, tampilkan `BrowserSupportGate` untuk fitur serial; fitur maps/geolocation tetap dijelaskan secara terpisah.
- **Secure context.** `localhost` dan `https://...` aman. Web Serial, Geolocation, dan clipboard lebih andal di HTTPS/localhost. Untuk hosting production, gunakan HTTPS.
- **Hosting.** Build `dist/` dapat di-host sebagai static site (Vercel/Netlify/GitHub Pages/custom static server). Tidak perlu backend app. Google Maps API key dibatasi oleh HTTP referrer/domain hosting.
- **Izin port.** Dialog pemilih port hanya muncul dari klik pengguna. `getPorts()` hanya untuk port yang pernah diizinkan.
- **Nama port COM tidak terbaca.** Tampilkan `Connected [USB 1A86:7523, CH340]` + label manual opsional.
- **Driver/OS.** Windows perlu driver CH340/CP210x bila diperlukan; Linux perlu izin device.
- **Reset board.** DTR/RTS dapat mereset board; parser harus toleran terhadap baris non-JSON.

### 1.4 Tech stack dan dependensi

| Lapisan | Pilihan | Catatan |
|---|---|---|
| Build tool | Vite + React + TypeScript (`strict: true`) | Template `react-ts` |
| Styling | Tailwind CSS v4 lewat `@tailwindcss/vite` | Dark mode berbasis class `dark` |
| Grafik | Recharts | Pilih satu library; Chart.js menjadi alternatif jika Recharts terasa berat |
| Ikon | `lucide-react` | Di-bundle lokal |
| Tipe Web Serial | `@types/w3c-web-serial` (dev) | Memberi tipe `navigator.serial` dan `SerialPort` |
| Pengujian | Vitest | Untuk parser, line buffer, ambang, CSV |
| Font | System font stack | Tanpa Google Fonts atau CDN |
| Penyimpanan | `localStorage` | Ambang batas, tema, baud rate, label port |

Perintah inisialisasi:

```bash
npm create vite@latest iot-serial-dashboard -- --template react-ts
cd iot-serial-dashboard
npm install recharts lucide-react
npm install -D tailwindcss @tailwindcss/vite @types/w3c-web-serial vitest
npm run dev
```

Koneksi internet hanya dibutuhkan sekali, saat `npm install`. Setelah `node_modules` terisi, `npm run dev` berjalan tanpa internet. Cadangan untuk mesin yang jarang dinyalakan dev server: `npm run build` lalu `npm run preview`, yang menyajikan folder `dist/` dari localhost.

### 1.5 Kontrak data firmware

| Kasus | Payload |
|---|---|
| BMP280 (`PAKAI_BME280 0`) | `{"temp":28.5,"alt":120.4,"press":998.2}` |
| BME280 (`PAKAI_BME280 1`) | `{"temp":28.5,"hum":65.2,"alt":120.4,"press":998.2}` |
| Lokasi opsional GPS/telemetry | `{"temp":28.5,"alt":120.4,"press":998.2,"lat":-6.208763,"lng":106.845599}` |
| Sensor gagal inisialisasi | `{"error":"sensor tidak terdeteksi"}` |

Satuan: `temp` dalam °C, `alt` dalam m, `hum` dalam %, `press` dalam hPa, `lat/lng` dalam derajat desimal. Dashboard memakai `lat/lng` bila ada; setelah itu manual pin; terakhir browser geolocation.

Aturan yang harus dipenuhi firmware:

- [ ] Satu objek JSON per baris, diakhiri `\n` (gunakan `Serial.println`).
- [ ] Titik sebagai pemisah desimal.
- [ ] Tidak boleh mengirim `nan` atau `inf`, karena keduanya bukan JSON valid.
- [ ] Field `hum` hanya ada pada mode BME280.
- [ ] Field `lat` dan `lng` opsional, harus berpasangan, valid pada rentang -90..90 dan -180..180.
- [ ] Teks debug non-JSON boleh ada di stream (parser menolaknya dan hanya menampilkannya di raw log), tetapi tidak boleh berada di baris yang sama dengan JSON.

Altitude berasal dari tekanan, dan perubahan 1 hPa setara sekitar 8 m. Angka altitude karenanya akan naik turun beberapa meter walaupun sensor diam. Hal ini wajar dan perlu dijelaskan lewat tooltip di KPI card.

### 1.6 Struktur folder

```
iot-serial-dashboard/
  index.html                  # script anti-flash untuk tema
  vite.config.ts              # plugin react + tailwind
  src/
    main.tsx
    App.tsx
    index.css                 # @import "tailwindcss" + custom-variant dark
    types/
      sensor.ts               # SensorReading, ParsedLine, MetricKey, SensorMode
    lib/
      constants.ts            # LIMITS, DEFAULT_THRESHOLDS, rentang fisik sensor
      lineBreakTransformer.ts
      parser.ts               # parseLine()
      thresholds.ts           # classify(), validasi, load/save localStorage
      csv.ts                  # toCsv(), downloadCsv()
      serialErrors.ts         # mapSerialError()
      usbChips.ts             # peta VID:PID -> nama chip
      format.ts               # format angka dan waktu
    hooks/
      useWebSerial.ts         # transport: connect, disconnect, read loop
      useSensorStore.ts       # reducer + state turunan
      useThresholds.ts
      useTheme.ts
      useNow.ts               # tick 1 detik untuk "x detik lalu" dan deteksi stale
    components/
      BrowserSupportGate.tsx
      ConnectionBar.tsx
      HardwareErrorBanner.tsx
      ThresholdAlertStrip.tsx
      KpiGrid.tsx
      KpiCard.tsx
      ChartGrid.tsx
      MetricChart.tsx
      RawSerialDrawer.tsx
      ThresholdSettings.tsx
      ExportButton.tsx
    dev/
      simulator.ts            # sumber data palsu, hanya aktif di mode dev
    __tests__/
      parser.test.ts
      lineBreakTransformer.test.ts
      thresholds.test.ts
      store.test.ts
      csv.test.ts
```

---

## 2. Serial Stream Parsing & Validation

### 2.1 Tipe data

```ts
// src/types/sensor.ts
export type MetricKey = 'temp' | 'alt' | 'hum' | 'press';

export interface SensorReading {
  t: number;          // epoch ms saat baris diterima di browser
  temp: number;
  alt: number;
  press: number;
  hum: number | null; // null pada mode BMP280
  lat: number | null; // opsional dari firmware
  lng: number | null; // opsional dari firmware
}

export type ParsedLine =
  | { kind: 'reading'; reading: SensorReading }
  | { kind: 'hw-error'; message: string }
  | { kind: 'invalid'; reason: string };

export type SensorMode = 'unknown' | 'BMP280' | 'BME280';
```

Firmware tidak mengirim cap waktu, jadi `t` diisi `Date.now()` saat baris diterima. Selisihnya dengan waktu baca sensor hanya puluhan milidetik, cukup untuk interval 1 detik.

### 2.2 Line buffering

Chunk dari USB tidak selaras dengan batas baris. Satu JSON bisa tiba terbelah, misalnya `{"temp":28.5,"al` lalu `t":120.4,"press":998.2}\n`. Memanggil `JSON.parse` pada potongan pertama melempar `SyntaxError`. Solusinya, semua teks masuk ke buffer dan hanya baris yang sudah diakhiri `\n` yang diteruskan.

```ts
// src/lib/lineBreakTransformer.ts
import { LIMITS } from './constants';

export class LineBreakTransformer implements Transformer<string, string> {
  private buffer = '';

  transform(chunk: string, controller: TransformStreamDefaultController<string>) {
    this.buffer += chunk;
    const parts = this.buffer.split(/\r?\n/);
    this.buffer = parts.pop() ?? ''; // sisa tanpa newline tetap di buffer
    for (const line of parts) controller.enqueue(line);

    // Pengaman: baud salah atau firmware tanpa newline bisa membuat buffer tumbuh tanpa batas
    if (this.buffer.length > LIMITS.MAX_LINE_CHARS) {
      controller.enqueue(this.buffer.slice(0, LIMITS.MAX_LINE_CHARS));
      this.buffer = '';
    }
  }

  // flush() sengaja tidak dibuat: sisa buffer saat stream ditutup adalah baris yang terpotong
}
```

Catatan implementasi:

- `TextDecoderStream` menangani karakter multibyte yang terbelah antar chunk.
- Pola `\r\n` yang terbelah (`\r` di akhir chunk, `\n` di awal chunk berikutnya) tertangani karena `\r` menunggu di buffer.

### 2.3 Parser dan validasi

```ts
// src/lib/parser.ts
import type { ParsedLine } from '../types/sensor';

const RANGE = {
  temp:  [-40, 85],     // rentang kerja BMP280/BME280, °C
  alt:   [-500, 9000],  // m
  hum:   [0, 100],      // %
  press: [300, 1100],   // hPa
} as const;

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

const inRange = (k: keyof typeof RANGE, v: number) => v >= RANGE[k][0] && v <= RANGE[k][1];

export function parseLine(raw: string, now = Date.now()): ParsedLine {
  const line = raw.trim();
  if (!line.startsWith('{')) {
    return { kind: 'invalid', reason: 'bukan JSON (teks debug atau boot log)' };
  }

  let data: unknown;
  try {
    data = JSON.parse(line);
  } catch {
    return { kind: 'invalid', reason: 'JSON terpotong atau tidak valid' };
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { kind: 'invalid', reason: 'bukan objek JSON' };
  }
  const obj = data as Record<string, unknown>;

  // 1. Paket error hardware
  if ('error' in obj) {
    const message = typeof obj.error === 'string' ? obj.error : 'error tidak dikenal';
    return { kind: 'hw-error', message };
  }

  // 2. Paket sensor: field wajib
  const temp = num(obj.temp);
  const alt = num(obj.alt);
  const press = num(obj.press);
  if (temp === null || alt === null || press === null) {
    return { kind: 'invalid', reason: 'field temp/alt/press hilang atau bukan angka' };
  }

  // 3. Field opsional hum: ada berarti BME280, tidak ada berarti BMP280
  let hum: number | null = null;
  if ('hum' in obj) {
    hum = num(obj.hum);
    if (hum === null) return { kind: 'invalid', reason: 'hum bukan angka (pembacaan gagal)' };
  }

  // 4. Rentang fisik
  if (!inRange('temp', temp) || !inRange('alt', alt) || !inRange('press', press) ||
      (hum !== null && !inRange('hum', hum))) {
    return { kind: 'invalid', reason: 'nilai di luar rentang fisik sensor' };
  }

  return { kind: 'reading', reading: { t: now, temp, alt, press, hum } };
}
```

Baris kosong dibuang oleh pemanggil sebelum `parseLine` dan tidak masuk raw log maupun penghitung.

Tabel keputusan (setiap baris menjadi minimal satu unit test):

| Input | Hasil | Efek di UI |
|---|---|---|
| Baris kosong | Diabaikan | Tidak tercatat |
| Tidak diawali `{` | `invalid` | Raw log berwarna amber, counter invalid naik |
| `JSON.parse` gagal | `invalid` | Sama dengan di atas |
| Ada key `error` | `hw-error` | Banner merah, grafik dan KPI lain tidak berubah |
| `temp`, `alt`, atau `press` bukan angka berhingga | `invalid` | Tidak masuk grafik |
| `hum` ada dan berupa angka | `reading`, mode BME280 | Kartu dan grafik kelembapan aktif |
| `hum` tidak ada | `reading` dengan `hum: null`, mode BMP280 | Kartu kelembapan menampilkan `N/A - BMP280 Mode` |
| `hum: null` atau `hum: "abc"` | `invalid` | Tidak masuk grafik |
| Nilai di luar rentang fisik | `invalid` | Tidak masuk grafik, alasan tampil di raw log |

### 2.4 State dan batas memori

```ts
// src/lib/constants.ts
export const LIMITS = {
  CHART_BUFFER: 120,        // titik untuk grafik (cukup untuk jendela 60 detik)
  SESSION_ROWS: 20_000,     // baris untuk CSV, sekitar 5,5 jam pada 1 Hz
  RAW_LOG_LINES: 200,
  MAX_LINE_CHARS: 4_096,
  STALE_AFTER_MS: 5_000,    // tanpa paket valid selama 5 detik dianggap tertunda
  INVALID_STREAK_HINT: 5,   // 5 baris invalid berturut-turut memunculkan petunjuk baud/firmware
} as const;
```

```ts
// src/hooks/useSensorStore.ts (bentuk state)
interface DashboardState {
  mode: SensorMode;
  latest: SensorReading | null;
  chartBuffer: SensorReading[];
  sessionRows: SensorReading[];
  stats: Record<MetricKey, { min: number; max: number } | null>;
  hwError: { message: string; at: number } | null;
  rawLog: { id: number; t: number; text: string; kind: 'reading' | 'hw-error' | 'invalid'; reason?: string }[];
  counters: { valid: number; hwError: number; invalid: number; invalidStreak: number };
  sessionTruncated: boolean; // true jika baris tertua sudah dibuang
}
```

Aturan reducer:

- **`LINE`**: tambahkan ke `rawLog` (potong ke 200 terakhir, potong teks tampilan ke 500 karakter), jalankan `parseLine`, lalu teruskan ke aksi berikut sesuai hasilnya.
- **`READING`**: set `latest`; tambahkan ke `chartBuffer` dan `sessionRows` dengan `slice(-LIMIT)`; perbarui `stats` secara inkremental (jangan memindai array); set `hwError = null` karena sensor sudah pulih; `invalidStreak = 0`; perbarui `mode`.
- **`HW_ERROR`**: set `hwError`, naikkan `counters.hwError`. Data lama di grafik tetap dipertahankan.
- **`INVALID`**: naikkan `counters.invalid` dan `invalidStreak`.
- **`RESET_SESSION`**: kosongkan semuanya. Aksi ini hanya dipicu tombol Reset dengan konfirmasi, bukan oleh Disconnect.

Deteksi mode:

- Mode awal `unknown`. Pembacaan valid pertama menentukan `BMP280` (hum `null`) atau `BME280` (hum berupa angka).
- Jika mode berubah di tengah sesi (firmware di-flash ulang tanpa menutup halaman), mode mengikuti pembacaan terbaru. Titik lama dengan `hum: null` tampil sebagai celah di grafik kelembapan (`connectNulls={false}`).

### 2.5 Hook `useWebSerial` (lapisan transport)

Hook ini hanya mengurus port dan stream. Ia tidak mengenal format JSON; hasilnya berupa string per baris yang diteruskan ke `onLine`.

```ts
// src/hooks/useWebSerial.ts (kerangka)
export type SerialStatus = 'idle' | 'connecting' | 'connected' | 'disconnecting' | 'disconnected' | 'error';

export function useWebSerial(onLine: (line: string) => void) {
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const loopRef = useRef<Promise<void> | null>(null);
  const keepReadingRef = useRef(false);
  const onLineRef = useRef(onLine);
  useEffect(() => { onLineRef.current = onLine; }); // callback terbaru tanpa merestart loop

  const [status, setStatus] = useState<SerialStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [portInfo, setPortInfo] = useState<{ vid?: number; pid?: number } | null>(null);

  async function readLoop(port: SerialPort) {
    // Loop luar: error non-fatal (BufferOverrun, Framing, Parity) membuat reader baru
    while (port.readable && keepReadingRef.current) {
      const decoder = new TextDecoderStream();
      const closed = port.readable
        .pipeTo(decoder.writable as WritableStream<Uint8Array>) // cast jika TypeScript mengeluh soal tipe stream
        .catch(() => {});
      const reader = decoder.readable
        .pipeThrough(new TransformStream(new LineBreakTransformer()))
        .getReader();
      readerRef.current = reader;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value !== undefined && value.trim() !== '') onLineRef.current(value);
        }
      } catch {
        // error baca: loop luar memutuskan lanjut atau berhenti dari port.readable
      } finally {
        reader.releaseLock();
        await closed;
      }
    }
    // port.readable bernilai null berarti error fatal (perangkat hilang)
    if (keepReadingRef.current) await handleLost();
  }

  const connect = useCallback(async (baudRate: number) => {
    setError(null);
    setStatus('connecting');
    try {
      const port = await navigator.serial.requestPort(); // wajib dari handler klik
      await port.open({ baudRate });
      portRef.current = port;
      const info = port.getInfo();
      setPortInfo({ vid: info.usbVendorId, pid: info.usbProductId });
      keepReadingRef.current = true;
      setStatus('connected');
      loopRef.current = readLoop(port);
    } catch (e) {
      const mapped = mapSerialError(e);
      setStatus(mapped ? 'error' : 'idle'); // null: pengguna menutup dialog
      setError(mapped?.message ?? null);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setStatus('disconnecting');
    keepReadingRef.current = false;
    try { await readerRef.current?.cancel(); } catch { /* sudah tertutup */ }
    try { await loopRef.current; } catch { /* diabaikan */ }
    try { await portRef.current?.close(); } catch { /* sudah tertutup */ }
    portRef.current = null;
    setStatus('disconnected');
  }, []);

  // handleLost(): dipanggil saat event 'disconnect' atau saat readable menjadi null
  // useEffect: pasang navigator.serial 'disconnect' (cek event.target === portRef.current)
  //            dan 'connect' (tawarkan tombol Reconnect lewat getPorts()), lepas saat unmount

  return { status, error, portInfo, connect, disconnect };
}
```

Pola membaca dan menutup port mengikuti panduan Web Serial dari dokumentasi Chrome: `cancel()` pada reader, tunggu `pipeTo` selesai, baru `port.close()`. Menutup port sebelum lock reader dilepas membuat `close()` gagal.

Pemetaan error saat membuka port:

```ts
// src/lib/serialErrors.ts
export function mapSerialError(e: unknown): { code: string; message: string } | null {
  if (e instanceof DOMException) {
    switch (e.name) {
      case 'NotFoundError':
        return null; // pengguna menutup dialog pemilih port, bukan error
      case 'InvalidStateError':
        return { code: 'already-open', message: 'Port sudah terbuka di halaman ini. Klik Disconnect, lalu coba lagi.' };
      case 'NetworkError':
        return { code: 'busy', message: 'Port tidak bisa dibuka. Tutup Serial Monitor Arduino IDE, PuTTY, atau tab dashboard lain yang memakai port ini. Di Linux, pastikan akun masuk grup dialout.' };
      case 'SecurityError':
        return { code: 'security', message: 'Akses serial diblokir. Buka dashboard lewat http://localhost di Chrome atau Edge.' };
    }
  }
  return { code: 'unknown', message: e instanceof Error ? e.message : 'Gagal membuka port.' };
}
```

---

## 3. UI/UX Layout & Component Architecture

### 3.1 Prinsip visual

- Bento grid 12 kolom, kartu `rounded-2xl` dengan border tipis dan padding 16 sampai 20 px.
- Warna status: normal (hijau), waspada (amber), bahaya (merah), tanpa ambang (abu). Setiap status juga memakai ikon dan teks, supaya tidak bergantung pada warna.
- Dark dan Light mode memakai class `dark` di `<html>`. Nilai awal mengikuti `prefers-color-scheme`, pilihan pengguna disimpan di `localStorage`. Script kecil inline di `index.html` memasang class sebelum React dirender agar layar tidak berkedip.
- Tailwind v4 membutuhkan deklarasi varian dark berbasis class di `index.css`:

  ```css
  @import "tailwindcss";
  @custom-variant dark (&:where(.dark, .dark *));
  ```

- Angka KPI memakai `tabular-nums` agar lebar digit tetap saat nilai berubah.
- Banner error memakai `role="alert"`, pill status koneksi memakai `aria-live="polite"`.

### 3.2 Wireframe desktop

```
+--------------------------------------------------------------------------+
| TOP CONTROL BAR                                                          |
| [Connect USB] [Baud: 115200 v] [Disconnect]   (o) Connected [USB 1A86:..]|
| [Jendela 30s|60s] [Ambang] [Export CSV] [Reset sesi] [Tema]              |
+--------------------------------------------------------------------------+
| ALERT BANNER (merah): Sensor tidak terdeteksi. Cek wiring I2C 0x76/0x77  |
| THRESHOLD ALERT STRIP (amber/merah): parameter di luar ambang            |
+----------------+----------------+----------------+-----------------------+
| KPI Suhu       | KPI Altitude   | KPI Kelembapan | KPI Tekanan           |
| 28.5 °C        | 120.4 m        | 65.2 %         | 998.2 hPa             |
| Normal         | Normal         | Normal         | Normal                |
| Min/Max, waktu | Min/Max, waktu | Min/Max, waktu | Min/Max, waktu        |
+----------------+----------------+----------------+-----------------------+
| Grafik Suhu                     | Grafik Altitude                        |
+---------------------------------+----------------------------------------+
| Grafik Kelembapan (atau N/A)    | Grafik Tekanan                         |
+---------------------------------+----------------------------------------+
| v RAW SERIAL MONITOR (drawer bawah, collapsible)                         |
+--------------------------------------------------------------------------+
```

Breakpoint:

- Di bawah 640 px: semua satu kolom, control bar menjadi dua baris, tombol Export dan Reset masuk menu.
- 640 sampai 1023 px: KPI dua kolom, grafik satu kolom.
- 1024 px ke atas: KPI empat kolom (`xl:grid-cols-4`), grafik dua kolom (`lg:grid-cols-2`).

### 3.3 Rincian komponen

**`App`**
- Memegang `useSensorStore`, `useWebSerial`, `useThresholds`, `useTheme`.
- Menghubungkan `useWebSerial(onLine)` ke `dispatch({ type: 'LINE', raw })`.
- Dalam mode dev dengan query `?sim=...`, memakai `dev/simulator.ts` sebagai pengganti `useWebSerial`.

**`BrowserSupportGate`**
- Membungkus seluruh dashboard. Jika `navigator.serial` tidak ada, tampilkan penjelasan: gunakan Chrome atau Edge, buka lewat `http://localhost`.

**`ConnectionBar`**
- Tombol `Connect USB / Pilih Port COM` (nonaktif saat `connecting` atau `connected`).
- Pilihan baud: `115200` (default) dan `9600`, nonaktif saat tersambung karena ganti baud berarti membuka ulang port. Pilihan terakhir disimpan di `localStorage`.
- Tombol `Disconnect`.
- Pill status: `Disconnected` (abu), `Connecting...` (kuning), `Connected [USB 1A86:7523, CH340] 115200 baud` (hijau), `Error: <pesan>` (merah). Nama chip berasal dari `usbChips.ts`: `2341` Arduino, `1A86` CH340/CH341, `10C4` CP210x, `0403` FTDI, `303A` Espressif; VID lain tampil sebagai heksadesimal saja.
- Petunjuk kuning di bawah pill bila `invalidStreak >= 5`: "Banyak baris tidak valid. Periksa baud rate dan format JSON firmware."
- Kontrol tambahan: jendela grafik 30 detik atau 60 detik, tombol Ambang, Export CSV, Reset sesi, toggle tema.

**`HardwareErrorBanner`**
- Muncul bila `state.hwError !== null`; hilang otomatis saat pembacaan valid berikutnya tiba; ada tombol tutup manual.
- Isi: judul "Sensor tidak terdeteksi", pesan dari firmware, lalu daftar periksa: kabel SDA, SCL, VCC (3,3 V), GND; alamat I2C `0x76` atau `0x77` (ditentukan pin SDO: ke GND memberi `0x76`, ke VCC memberi `0x77`) dan harus sama dengan alamat di `begin()` pada firmware; konfirmasi modul benar-benar BMP280 atau BME280.

**`ThresholdAlertStrip`**
- Menampilkan satu baris ringkas untuk setiap parameter yang statusnya `warning` atau `danger`, misalnya "Suhu 34.1 °C: Waspada (batas atas 33)". Tidak tampil bila semuanya normal.
- Tanpa suara secara bawaan.

**`KpiGrid` dan `KpiCard`**
- Isi kartu: ikon dan nama parameter, angka besar dengan satuan, badge status (Normal, Waspada, Bahaya), baris `Min x · Max y` sesi berjalan, dan `Update HH:mm:ss (n dtk lalu)` yang diperbarui `useNow(1000)`.
- Keterangan kecil pada kartu altitude: "Referensi tekanan laut 1013.25 hPa". Tooltip menjelaskan bahwa altitude diturunkan dari tekanan sehingga bergoyang beberapa meter.
- Empat kondisi tampilan: `waiting` (skeleton "Menunggu data"), `live`, `stale` (lebih dari 5 detik tanpa paket valid: angka diredupkan dan badge "Tertunda"), dan `na` (kelembapan pada mode BMP280: teks `N/A - BMP280 Mode` dan keterangan "Sensor tidak menyediakan kelembapan"; kartu lain tidak terpengaruh).

**`ChartGrid` dan `MetricChart`**
- Satu grafik per parameter, masing-masing menerima deret datanya sendiri dan `MetricKey`.
- Recharts `AreaChart` di dalam `ResponsiveContainer`, dengan `isAnimationActive={false}` dan `dot={false}` supaya pergeseran jendela tidak patah-patah.
- Sumbu X numerik (`type="number"`, `scale="time"`) dengan domain `[latest.t - windowMs, latest.t]`, label `HH:mm:ss`. Data difilter dari `chartBuffer` berdasarkan waktu, bukan jumlah titik, sehingga jendela tetap benar bila interval berubah.
- Sumbu Y memakai padding dan rentang minimum agar nilai yang hampir datar tidak tampak seperti lonjakan: suhu minimal 2 °C, altitude 4 m, kelembapan 5 %, tekanan 1 hPa.
- `ReferenceLine` putus-putus untuk batas waspada (amber) dan bahaya (merah) bila ambang aktif.
- Pada mode BMP280, sel kelembapan tetap ada agar tata letak stabil, berisi placeholder `N/A - BMP280 Mode` dan petunjuk untuk beralih ke BME280 (`PAKAI_BME280 1`).
- Dibungkus `React.memo`.

**`RawSerialDrawer`**
- Drawer di bawah, collapsible, menampilkan maksimal 200 baris terakhir dengan cap waktu.
- Warna baris: netral (data valid), merah (paket error), amber (invalid, disertai alasan dari parser).
- Kontrol: Pause tampilan, Auto-scroll (mati otomatis saat pengguna menggulir ke atas), Clear, Copy.
- Header menampilkan penghitung `valid / error / invalid`.

**`ThresholdSettings`**
- Dialog berisi empat blok (suhu, altitude, kelembapan, tekanan), masing-masing dengan empat kolom: `warnMin`, `warnMax`, `dangerMin`, `dangerMax`. Kolom kosong berarti batas itu nonaktif.
- Validasi: `dangerMin <= warnMin <= warnMax <= dangerMax` untuk batas yang terisi. Simpan hanya jika valid.
- Tombol "Kembalikan default".

**`ExportButton`**
- Nonaktif bila `sessionRows` kosong. Memiliki pilihan format (lihat bagian CSV).

### 3.4 Logika ambang batas

```ts
// src/lib/thresholds.ts
export type Status = 'normal' | 'warning' | 'danger' | 'none';

export interface Range {
  warnMin: number | null; warnMax: number | null;
  dangerMin: number | null; dangerMax: number | null;
}

export function classify(v: number, r: Range): Status {
  const all = [r.warnMin, r.warnMax, r.dangerMin, r.dangerMax];
  if (all.every((x) => x === null)) return 'none';
  if ((r.dangerMin !== null && v < r.dangerMin) || (r.dangerMax !== null && v > r.dangerMax)) return 'danger';
  if ((r.warnMin !== null && v < r.warnMin) || (r.warnMax !== null && v > r.warnMax)) return 'warning';
  return 'normal';
}
```

Nilai awal (asumsi untuk iklim tropis dalam ruangan, dapat diubah di dialog):

| Parameter | Waspada di luar | Bahaya di luar |
|---|---|---|
| Suhu (°C) | 18 sampai 33 | 10 sampai 38 |
| Altitude (m) | nonaktif | nonaktif |
| Kelembapan (%) | 30 sampai 80 | 20 sampai 90 |
| Tekanan (hPa) | 980 sampai 1020 | 960 sampai 1040 |

Altitude tidak diberi ambang karena nilainya bergantung lokasi dan turunan dari tekanan; badge-nya menampilkan "Tanpa ambang" sampai pengguna mengaktifkannya. Tekanan stasiun pada ketinggian ratusan meter berada di sekitar 1000 hPa, jadi angka di atas perlu disesuaikan dengan lokasi pemasangan.

Penyimpanan: kunci `iot-dashboard:v1:thresholds`, `iot-dashboard:v1:theme`, `iot-dashboard:v1:baud`, `iot-dashboard:v1:portLabel`. Setiap akses `localStorage` dibungkus `try/catch`. Data yang dibaca divalidasi bentuknya dan digabung dengan default untuk kunci yang hilang; jika rusak, pakai default.

### 3.5 Export CSV

```ts
// src/lib/csv.ts
export type CsvPreset = 'standar' | 'excel-id';

export function toCsv(rows: SensorReading[], preset: CsvPreset): string {
  const sep = preset === 'excel-id' ? ';' : ',';
  const fmt = (v: number | null) =>
    v === null ? '' : preset === 'excel-id' ? String(v).replace('.', ',') : String(v);
  const header = ['waktu_lokal', 'epoch_ms', 'suhu_c', 'altitude_m', 'kelembapan_pct', 'tekanan_hpa'];
  const body = rows.map((r) =>
    [formatLocal(r.t), r.t, fmt(r.temp), fmt(r.alt), fmt(r.hum), fmt(r.press)].join(sep));
  return [header.join(sep), ...body].join('\r\n');
}

export function downloadCsv(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
```

- Nama berkas: `iot-log-YYYYMMDD-HHmmss.csv`.
- Preset `standar`: pemisah koma, desimal titik. Preset `excel-id`: pemisah titik koma, desimal koma, untuk Excel dengan pengaturan regional Indonesia yang membaca koma sebagai desimal. Tanpa preset ini, Excel Indonesia sering menaruh seluruh baris dalam satu kolom atau membaca `28.5` sebagai teks.
- Kolom `kelembapan_pct` kosong pada mode BMP280.
- Data diambil dari `sessionRows`, bukan dari `chartBuffer`.
- Export tetap bisa dilakukan setelah kabel tercabut karena data sesi tidak dihapus saat Disconnect.

---

## 4. Step-by-Step Implementation Plan

### Fase 0: Prasyarat

- [ ] Node.js LTS terpasang; Chrome atau Edge versi terbaru tersedia.
- [ ] Driver USB-serial terpasang bila board memerlukannya (CH340 atau CP210x); pada Linux akun sudah masuk grup `dialout`.
- [ ] Firmware memenuhi kontrak di bagian 1.5. Verifikasi dengan Serial Monitor Arduino IDE pada 115200 baud, lalu tutup Serial Monitor sebelum memakai dashboard.

### Fase 1: Inisialisasi Vite Project

- [ ] Buat proyek dengan `npm create vite@latest iot-serial-dashboard -- --template react-ts`, lalu pasang dependensi (bagian 1.4).
- [ ] Daftarkan plugin `@tailwindcss/vite` di `vite.config.ts`; isi `src/index.css` dengan `@import "tailwindcss";` dan `@custom-variant dark ...`.
- [ ] Pastikan `types` di `tsconfig.app.json` memuat `vite/client` dan `w3c-web-serial`; `strict` aktif.
- [ ] Hapus aset dan CSS bawaan template, ubah `<title>`, tambahkan script anti-flash tema di `index.html`.
- [ ] Tambahkan script `"test": "vitest run"` di `package.json`.
- [ ] Verifikasi: `npm run dev` menampilkan halaman, `npm run build` lulus tanpa error TypeScript.
- [ ] Verifikasi tanpa internet: putuskan koneksi, restart dev server, muat ulang halaman. Tab Network DevTools tidak boleh menampilkan permintaan ke domain luar.

### Fase 2: Lapisan data (tanpa UI)

- [ ] `types/sensor.ts` dan `lib/constants.ts` (`LIMITS`, rentang fisik, `DEFAULT_THRESHOLDS`).
- [ ] `lib/lineBreakTransformer.ts` beserta test: JSON terbelah di tengah, `\r\n`, beberapa baris dalam satu chunk, `\r` dan `\n` terpisah chunk, baris tanpa newline melebihi `MAX_LINE_CHARS`.
- [ ] `lib/parser.ts` beserta test untuk setiap baris pada tabel keputusan (bagian 2.3), termasuk `nan`, `null`, `hum` ada dan tidak ada, serta nilai di luar rentang.
- [ ] `hooks/useSensorStore.ts` (reducer) beserta test: batas `chartBuffer` dan `sessionRows`, Min/Max inkremental, deteksi mode, `hwError` hilang setelah pembacaan valid, `invalidStreak`.
- [ ] `dev/simulator.ts`: menghasilkan teks dalam potongan acak lalu melewatkannya ke `LineBreakTransformer` yang sama dengan jalur nyata. Skenario lewat query string: `?sim=bmp280`, `?sim=bme280`, `?sim=error`, `?sim=noisy` (boot log, JSON terpotong, `nan`, nilai di luar rentang). Hanya aktif jika `import.meta.env.DEV`.
- [ ] Jalankan `npm test`; seluruh test hijau sebelum lanjut.

### Fase 3: Custom hook `useWebSerial`

- [ ] Implementasi `connect` (`requestPort`, `open`, `getInfo`) dan `readLoop` sesuai kerangka di bagian 2.5.
- [ ] Implementasi `disconnect` dengan urutan `reader.cancel()`, tunggu loop, `port.close()`.
- [ ] Handler event `disconnect` (cabut kabel) dan `connect` (tawarkan Reconnect lewat `getPorts()` tanpa dialog).
- [ ] `lib/serialErrors.ts` dan `lib/usbChips.ts`.
- [ ] `ConnectionBar` dengan pill status, pilihan baud, dan petunjuk invalid streak.
- [ ] `BrowserSupportGate`.
- [ ] Uji awal dengan perangkat: Connect, lihat baris masuk di `console.log`, Disconnect, Connect lagi tanpa memuat ulang halaman.

### Fase 4: KPI Cards dan grafik terpisah per output

- [ ] `useNow(1000)` untuk "n dtk lalu" dan deteksi stale.
- [ ] `KpiCard` dengan empat kondisi (`waiting`, `live`, `stale`, `na`), Min/Max sesi, dan waktu pembaruan.
- [ ] `KpiGrid` dengan empat kartu: suhu, altitude, kelembapan, tekanan.
- [ ] `MetricChart` memakai Recharts: domain X berbasis waktu, domain Y dengan rentang minimum, tooltip, tanpa animasi.
- [ ] `ChartGrid` dengan empat grafik terpisah; sel kelembapan berubah menjadi placeholder pada mode BMP280.
- [ ] Selektor jendela 30 detik atau 60 detik.
- [ ] Layout bento responsif dan toggle Dark/Light (`useTheme`).
- [ ] Verifikasi dengan `?sim=bmp280` dan `?sim=bme280`: kartu kelembapan berubah antara `N/A - BMP280 Mode` dan angka, grafik lain tidak terganggu.

### Fase 5: Export CSV, Threshold Alert, banner error, dan raw log

- [ ] `HardwareErrorBanner` (muncul saat `{"error":...}`, hilang saat pembacaan valid).
- [ ] `RawSerialDrawer` dengan pewarnaan, Pause, Auto-scroll, Clear, Copy, dan penghitung.
- [ ] `lib/thresholds.ts`, `useThresholds` (dengan `localStorage`), dan `ThresholdSettings` dengan validasi.
- [ ] Badge status pada KPI card, garis referensi di grafik, dan `ThresholdAlertStrip`.
- [ ] `lib/csv.ts` beserta test (header, pemisah, desimal, `hum` kosong) dan `ExportButton` dengan dua preset.
- [ ] Tombol Reset sesi dengan konfirmasi.
- [ ] Peringatan "Log CSV penuh, baris tertua dibuang" saat `sessionTruncated` bernilai true.

### Fase 6: Pengujian lokal dengan perangkat

- [ ] Mode BMP280: payload tanpa `hum`; kartu kelembapan `N/A - BMP280 Mode`, tiga grafik lain berjalan.
- [ ] Mode BME280: payload dengan `hum`; keempat grafik berjalan, kartu kelembapan menampilkan angka.
- [ ] Error sensor: lepas kabel SDA lalu reset board; banner muncul. Sambung kembali lalu reset; banner hilang saat data valid tiba.
- [ ] Cabut kabel USB saat data berjalan: status berubah menjadi `Disconnected`, data di layar tetap ada, Export CSV masih berfungsi.
- [ ] Sambungkan kembali kabel: tombol Reconnect muncul dan membuka port tanpa dialog.
- [ ] Buka Serial Monitor Arduino IDE lebih dulu, lalu klik Connect: pesan "Port tidak bisa dibuka" muncul dengan petunjuk yang benar.
- [ ] Pilih baud 9600 padahal firmware 115200: petunjuk invalid streak muncul setelah 5 baris, raw log berisi karakter acak, memori tidak naik.
- [ ] Ubah ambang suhu di dialog, muat ulang halaman, pastikan nilai bertahan. Hapus data `localStorage` secara manual dan pastikan halaman tetap berjalan dengan default.
- [ ] Uji tahan 30 menit: pantau JS heap di DevTools (Performance Monitor); heap harus mendatar setelah buffer penuh.
- [ ] Biarkan tab di latar belakang 5 menit, lalu kembali: periksa apakah data tetap masuk (hasilnya menentukan perlu tidaknya catatan di README).
- [ ] Buka CSV hasil export di Excel atau LibreOffice dengan kedua preset.
- [ ] Periksa tampilan pada lebar 360, 768, dan 1440 px, dalam mode Dark dan Light.

### Fase 7: Finalisasi

- [ ] `README.md` singkat: cara menjalankan, syarat browser, troubleshooting (driver, grup `dialout`, port terkunci).
- [ ] Pastikan `npm run build` dan `npm run preview` berjalan sebagai cadangan.
- [ ] Pastikan semua test lulus. Jika key Google Maps belum diisi, dashboard tetap berjalan dan permintaan Google Maps tidak dikirim.

### Fase 8: Precise Location & Telemetry Map

- [ ] Siapkan `.env.example` dengan `VITE_GOOGLE_MAPS_API_KEY=`; `.env` tidak masuk git.
- [ ] Aktifkan Maps JavaScript API, Geocoding API, dan Elevation API di Google Cloud; batasi API key berdasarkan HTTP referrer domain hosting.
- [ ] Gunakan urutan lokasi: `lat/lng` serial → manual pin/drag → browser `watchPosition` dengan akurasi.
- [ ] Tampilkan marker custom, lingkaran akurasi ±m, koordinat 6 desimal, sumber lokasi, dan kontrol Peta/Satelit/Hybrid serta Dark/Light.
- [ ] Tampilkan alamat reverse geocoding: jalan/area, kelurahan/desa, kecamatan, kota/kabupaten, provinsi, kode pos.
- [ ] Sediakan tombol `Kalibrasi ke Elevasi Google` yang menghitung offset `elevasi Google - alt sensor` untuk Virtual LCD dan Altimeter HUD.
- [ ] Uji fallback: key kosong, API belum aktif, kuota habis, izin geolocation ditolak, dan domain referrer tidak diizinkan.

### Fase 9: Hosting production HTTPS

- [ ] Jalankan `npm run build`, lalu host `dist/` sebagai static site pada HTTPS.
- [ ] Pastikan semua halaman dimuat lewat HTTPS agar Web Serial dan Geolocation tersedia.
- [ ] Tambahkan domain hosting ke restriction API key Google Maps; gunakan key terpisah untuk development dan production bila perlu.
- [ ] Verifikasi dashboard serial tetap berfungsi di localhost/HTTPS, dan modul Maps menampilkan fallback bila Google API gagal.

---

## 5. Local Edge Cases & Error Handling

| Skenario | Deteksi | Perilaku UI | Penanganan |
|---|---|---|---|
| Kabel USB tercabut mendadak | Event `navigator.serial` `disconnect` dengan `target === port`, atau `port.readable` menjadi `null`, atau `reader.read()` melempar `NetworkError` | Status `Disconnected`, pesan "Perangkat terputus"; grafik, KPI, dan data CSV tetap ada | Hentikan loop, `close()` dalam `try/catch`, tawarkan Reconnect saat event `connect` muncul |
| Port terkunci Serial Monitor Arduino IDE, PuTTY, atau tab dashboard lain | `port.open()` melempar `NetworkError` | Status `Error` dengan pesan yang menyebut aplikasi penyebab umum dan grup `dialout` untuk Linux | `mapSerialError`; tombol Connect aktif lagi tanpa perlu muat ulang |
| Port sudah dibuka di halaman ini | `InvalidStateError` | Pesan "Klik Disconnect, lalu coba lagi" | Tombol Connect nonaktif selama `connected` mencegah kasus ini; pesan ini jaring pengaman |
| Browser tidak mendukung atau bukan secure context | `!('serial' in navigator)` | `BrowserSupportGate` menggantikan dashboard | Petunjuk memakai Chrome atau Edge lewat `http://localhost` |
| Pengguna menutup dialog pemilih port | `NotFoundError` | Kembali ke `idle` tanpa pesan error | `mapSerialError` mengembalikan `null` |
| Baud rate tidak cocok | Banyak baris invalid berturut-turut, sering berisi karakter acak | Petunjuk kuning setelah 5 baris invalid beruntun | `invalidStreak`; pengguna memutus sambungan dan memilih baud lain |
| Board reset saat port dibuka | Baris awal bukan JSON | Muncul di raw log berwarna amber; tidak merusak grafik | Parser menolak baris yang tidak diawali `{` |
| JSON terpotong atau rusak | `JSON.parse` melempar `SyntaxError` | Baris amber di raw log | Line buffer mencegah pemotongan akibat chunk; `try/catch` menangkap sisa kasus |
| Baris tanpa newline tumbuh tanpa batas | Panjang buffer melebihi 4.096 karakter | Baris dipotong dan ditandai invalid | Pengaman di `LineBreakTransformer` |
| Mikrokontroler hang, port tetap terbuka | Tidak ada paket valid selama lebih dari 5 detik | KPI card diredupkan dengan badge "Tertunda" | `useNow` membandingkan `Date.now()` dengan `latest.t` |
| Sensor gagal lalu pulih | Paket `error` diikuti paket valid | Banner muncul, lalu hilang otomatis pada pembacaan valid pertama | `hwError` dikosongkan oleh aksi `READING` |
| Ganti BMP280 ke BME280 (atau sebaliknya) | Field `hum` muncul atau hilang | Mode berubah; kartu dan grafik kelembapan menyesuaikan, grafik lain tidak berubah | Mode ditentukan per pembacaan; `connectNulls={false}` |
| Memori browser bertambah terus | Ukuran array state | Grafik tetap ringan; peringatan bila log CSV penuh | `LIMITS`: 120 titik grafik, 20.000 baris sesi (sekitar 2 MB), 200 baris raw log; `slice(-N)` di reducer |
| Halaman dimuat ulang | Stream tertutup otomatis | Status `Disconnected`, data sesi hilang | Pengguna klik Connect (atau Reconnect dari `getPorts()`); ingatkan Export CSV sebelum menutup tab |
| `localStorage` rusak atau diblokir | `try/catch` pada baca dan tulis | Dashboard memakai ambang default, tanpa error | Validasi dan fallback di `useThresholds` |
| Tab dibuka di latar belakang | Data tetap masuk atau tidak | Diverifikasi di Fase 6 | Deteksi stale memakai cap waktu, bukan timer, sehingga tetap benar setelah tab aktif lagi |

---

## Lampiran A: Kriteria selesai

- [ ] `npm run dev` menampilkan dashboard di `http://localhost` tanpa internet dan tanpa permintaan jaringan eksternal.
- [ ] Connect USB, baud 115200 dan 9600, serta Disconnect berfungsi; pill status menampilkan state yang benar.
- [ ] Payload BMP280, BME280, dan `{"error":"sensor tidak terdeteksi"}` ditangani sesuai tabel keputusan; tidak ada `SyntaxError` yang lolos ke console.
- [ ] Empat KPI card menampilkan nilai terbaru, status ambang, Min/Max sesi, dan waktu pembaruan; kartu kelembapan menampilkan `N/A - BMP280 Mode` tanpa mengganggu komponen lain.
- [ ] Empat grafik terpisah bergeser dalam jendela 30 atau 60 detik tanpa animasi patah-patah.
- [ ] Raw Serial Monitor dapat dibuka, dijeda, dibersihkan, dan disalin.
- [ ] Export CSV menghasilkan berkas yang terbaca benar di Excel (kedua preset) dan LibreOffice.
- [ ] Ambang batas bertahan setelah halaman dimuat ulang.
- [ ] Semua skenario di bagian 5 sudah diuji dan lulus; JS heap datar setelah uji tahan 30 menit.
- [ ] `npm test` dan `npm run build` lulus.

## Lampiran B: Di luar cakupan

- Mengirim perintah dari browser ke mikrokontroler (arah tulis pada port).
- Penyimpanan data jangka panjang atau basis data.
- Banyak perangkat sekaligus atau akses dari komputer lain di jaringan.
- Notifikasi email atau push (notifikasi suara lokal Web Audio Already included di dashboard).

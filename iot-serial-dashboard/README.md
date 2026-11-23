# IoT Serial Dashboard

Dashboard lokal satu halaman untuk memantau BMP280/BME280 lewat Web Serial API. Data dibaca dari USB COM port, diproses di browser, tanpa backend/cloud.

## Menjalankan

```bash
cd iot-serial-dashboard
npm install
npm run dev
```

Buka `http://localhost:5173` di **Chrome** atau **Edge** desktop. Setelah `npm install`, aplikasi bisa dijalankan tanpa internet.

Cadangan tanpa dev server:

```bash
npm run build
npm run preview
```

## Syarat Browser

- Web Serial API hanya tersedia di browser Chromium (Chrome/Edge).
- Jalankan lewat secure context: `http://localhost` atau `http://127.0.0.1`. Jangan pakai IP LAN seperti `http://192.168.x.x:5173`.
- Dialog pemilih port hanya muncul dari klik tombol Connect USB.

## Format Data Firmware

Kirim satu baris JSON per detik, diakhiri newline (`Serial.println`), 115200 baud (opsi 9600):

```json
{"temp":28.5,"alt":120.4,"press":998.2}
{"temp":28.5,"hum":65.2,"alt":120.4,"press":998.2}
{"error":"sensor tidak terdeteksi"}
```

`temp` °C, `alt` m, `hum` %, `press` hPa. `hum` hanya untuk BME280. Jangan kirim `nan`/`inf`.

## Troubleshooting

- **Browser tidak didukung / `navigator.serial` undefined**: gunakan Chrome/Edge dan buka lewat `localhost`, bukan IP jaringan.
- **Port tidak bisa dibuka / busy**: tutup Arduino IDE Serial Monitor, PuTTY, atau tab dashboard lain yang memakai port sama.
- **Linux `/dev/ttyUSB0` permission denied**: tambahkan user ke grup `dialout` (atau `uucp` di Arch), lalu logout/login.
- **Driver USB-serial**: pastikan driver CH340/CP210x terpasang jika board membutuhkannya.
- **Banyak baris invalid**: cek baud rate dan pastikan firmware mengirim JSON valid satu baris.
- **Data tidak masuk saat tab latar belakang**: kembali ke tab; deteksi stale memakai cap waktu, bukan timer interval data.
- **Reload halaman**: stream terputus dan data sesi hilang; export CSV sebelum reload/close.

## Simulasi Dev

Mode dev mendukung sumber data palsu: `?sim=bmp280`, `?sim=bme280`, `?sim=error`, `?sim=noisy`.

## Perintah

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm test
```
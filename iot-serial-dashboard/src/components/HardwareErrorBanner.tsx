interface Props {
  message: string
  onDismiss: () => void
}

export function HardwareErrorBanner({ message, onDismiss }: Props) {
  return (
    <section role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Sensor tidak terdeteksi</h2>
          <p className="mt-1 text-sm">{message}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            <li>Cek kabel SDA, SCL, VCC (3,3 V), dan GND.</li>
            <li>Pastikan alamat I2C <code>0x76</code> atau <code>0x77</code> sesuai pin SDO dan pemanggilan <code>begin()</code> di firmware.</li>
            <li>Konfirmasi modul benar-benar BMP280 atau BME280.</li>
          </ul>
        </div>
        <button type="button" onClick={onDismiss} className="rounded-md border border-red-300 px-2 py-1 text-xs dark:border-red-800">
          Tutup
        </button>
      </div>
    </section>
  )
}
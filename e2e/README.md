# E2E Suite — QA BETE-11 (Playwright)

Suite end-to-end untuk aplikasi eksperimen pajak: **test matrix 4 grup
treatment × alur penuh**, asertif integritas eksperimen (durasi per kasus,
timer 40 menit, random assignment, anti-cheat nav, konsistensi DB),
idempotensi/error API, dan responsivitas mobile.

Suite ini berjalan **100% lokal** (Docker Postgres + gateway REST kompatibel
Supabase + aplikasi production build di `localhost:3000`) — tidak pernah
menyentuh instance produksi.

## Prasyarat

- Node.js 20.9+ dan npm (deps terpasang: `npm install`)
- Docker (untuk Postgres + PostgREST + gateway)
- Chromium (default path `/usr/bin/chromium`; dapat diubah via `E2E_CHROMIUM_PATH`)

## Menjalankan

```bash
# 1. Stack lokal (idempoten): Postgres + migrasi + gateway + .env.local
bash e2e/local-stack.sh

# 2. Aplikasi (production build — sama seperti rilis)
npm run build
npm start                 # http://localhost:3000

# 3. Suite E2E
npm run e2e               # atau: npx playwright test --config e2e/playwright.config.ts
```

Variabel lingkungan (opsional):

| Variabel           | Default                                                 | Fungsi                              |
| ------------------ | ------------------------------------------------------- | ----------------------------------- |
| `E2E_BASE_URL`     | `http://localhost:3000`                                 | Aplikasi yang diuji                 |
| `E2E_PG_URL`       | `postgres://postgres:postgres@localhost:54329/postgres` | Postgres lokal untuk asertif DB     |
| `E2E_CHROMIUM_PATH`| `/usr/bin/chromium`                                     | Browser Chromium                    |
| `E2E_WORKERS`      | `2`                                                     | Jumlah worker paralel antar-file    |

Global setup memverifikasi aplikasi & DB hidup lalu **mengosongkan tabel
eksperimen** (container lokal khusus E2E).

## Struktur

```text
e2e/
├── playwright.config.ts        # konfigurasi Playwright (retries: 0 — flaky = gagal)
├── global-setup.ts             # cek aplikasi + DB, reset tabel
├── local-stack.sh              # siapkan Postgres + PostgREST + gateway + .env.local
├── helpers/
│   ├── db.ts                   # akses Postgres lokal (asertif 4 tabel)
│   ├── flow.ts                 # langkah alur + stub deterministik grup treatment
│   ├── browser.ts              # inspeksi listener beforeunload (CDP) + helper back-nav
│   └── payload.ts              # builder payload API (valid & varian tampered)
└── specs/
    ├── 01-four-groups.spec.ts       # matriks 4 grup × alur penuh + integritas DB
    ├── 02-case-durations.spec.ts    # durasi per kasus: presisi detik, kumulatif, tahan refresh
    ├── 03-global-timer.spec.ts      # timer lintas step, deadline absolut, perilaku habis
    ├── 04-anticheat-nav.spec.ts     # blokir back, paksa maju, gerbang step, beforeunload
    ├── 05-random-assignment.spec.ts # distribusi grup 1–4 dari N login nyata
    ├── 06-refresh-every-step.spec.ts# refresh di tiap step → state & timer persisten
    ├── 07-api-idempotency.spec.ts   # submit ganda + payload tampered (API langsung)
    └── 08-mobile.spec.ts            # alur penuh viewport ponsel 390×844
```

## Catatan desain penting

- **Determinisme grup treatment**: grup ditentukan aplikasi via
  `assignTreatmentGroup()` (rng = `Math.random`). Suite men-stub `Math.random`
  lewat `page.addInitScript` **sebelum skrip aplikasi berjalan** — jadi build
  produksi yang diuji identik dengan rilis, tanpa override internal aplikasi.
  Seed per grup: 0.125→1, 0.375→2, 0.625→3, 0.875→4.
- **beforeunload**: Chromium headless tidak menampilkan dialog
  `beforeunload`, sehingga kontrak diuji langsung pada KEHADIRAN listener
  (aktif selama sesi berjalan, terhapus setelah submit) via CDP
  `DOMDebugger.getEventListeners` — lihat `helpers/browser.ts`.
- **Timer habis**: menggeser `deadlineTimestamp` di storage ke masa lalu
  (meniru 40 menit berlalu) + reload sinkron — perilaku auto-submit dites
  end-to-end sampai baris DB tersimpan dengan `global_remaining_seconds = 0`.
- **Asertif DB**: setelah tiap alur submit, suite memverifikasi langsung di
  Postgres lokal: 1 baris `participants`, 1 `sessions` (`treatment_group`
  sesuai teks yang dirender, `global_remaining_seconds` 0–2400),
  `case_logs` tepat 14 dengan rank unik 1–14, dan 1 `survey_results`
  (biaya, keyakinan, q1–q3, `manipulation_check`) sesuai isian UI.
- **Tanpa retry**: tes flaky diperlakukan sebagai kegagalan (dilarang
  menyembunyikan flakiness dengan retry/assertion yang dilemahkan).

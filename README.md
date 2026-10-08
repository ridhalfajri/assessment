# Assessment — Sistem Eksperimen Pengambilan Keputusan Pajak

Aplikasi web instrumen riset akuntansi keprilakuan: simulasi studi kasus daring
dengan random assignment ke 4 grup treatment, global countdown timer 40 menit,
pencatatan durasi pencarian informasi per kasus (presisi detik), dan batch
submit ke Supabase.

## Tech Stack

- [Next.js](https://nextjs.org) 16 (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com) v4
- [Supabase](https://supabase.com) (PostgreSQL)

## Menjalankan Secara Lokal

Prasyarat: Node.js 20.9+ dan npm.

```bash
git clone <repo-url> && cd assessment
npm install
cp .env.example .env.local   # lalu isi nilai aslinya
npm run dev                  # buka http://localhost:3000
```

### Scripts

| Perintah       | Fungsi                                    |
| -------------- | ----------------------------------------- |
| `npm run dev`  | Server pengembangan di `localhost:3000`   |
| `npm run build`| Build produksi                            |
| `npm run start`| Menjalankan hasil build produksi          |
| `npm run lint` | ESLint                                    |
| `npm test`     | Vitest — unit + route + integrasi API (BETE-7), unit engine (BETE-6)* |

\* Uji integrasi API butuh Postgres lokal (`TEST_DATABASE_URL`, lihat `supabase/README.md`);
tanpa env itu suite integrasi di-skip otomatis.

## Engine Eksperimen (BETE-6)

Integritas data eksperimen dijaga oleh mesin state di `src/lib/experiment.ts`
(murni & teruji) plus tiga komponen klien:

- **State & persistensi** (`src/context/ExperimentContext.tsx`): state
  `{ sessionData, caseLogs, recommendations, questionnaire, demographics }`
  dipersist write-through ke **sessionStorage dan localStorage**
  (kunci `experiment.state.v1`) dan direhidrasi otomatis saat mount — F5 tidak
  menghilangkan data maupun sisa waktu.
- **Timer anti-drift**: yang disimpan adalah **deadline absolut**
  (`sessionData.deadlineTimestamp`), bukan sisa detik; sisa waktu selalu
  dihitung ulang dari jam dinding. Saat mencapai 00:00: input dikunci
  (status `expired`), data terisi di-auto-submit dengan flag `isComplete: false`
  (best-effort), lalu diarahkan ke `/debriefing`.
- **Random assignment**: `assignTreatmentGroup()` mengacak grup 1–4 secara
  merata, dipanggil tepat sekali saat submit informed consent, dan dikunci —
  tidak ada action yang bisa mengubah `treatmentGroupId` setelahnya.
- **Navigasi satu arah** (`src/components/AntiCheatGuard.tsx`): traversal
  back/forward dicegah via Navigation API (`beforenavigate`) dengan fallback
  popstate yang memaksa maju, `beforeunload` aktif selama eksperimen berjalan
  dan nonaktif setelah submit final, serta langkah tidak pernah mundur.

### Variabel Lingkungan

Salin `.env.example` ke `.env.local` dan isi nilai dari Dashboard Supabase
(Project Settings → API). Jangan pernah commit `.env.local`.

| Variabel                       | Dipakai di      | Keterangan                                                          |
| ------------------------------ | --------------- | ------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`     | client & server | URL project Supabase.                                               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| client & server | Anon/public key; aman untuk browser (dibatasi RLS).                 |
| `SUPABASE_SERVICE_ROLE`        | server only     | Service role key; melewati RLS. Jangan pernah di-expose ke client.  |

Build tetap berhasil tanpa env terisi — nilai env baru dibaca saat klien
Supabase benar-benar dipakai (lihat `src/lib/supabase.ts`).

## Halaman Login/Consent & Skenario Dinamis (BETE-8)

Alur pembuka eksperimen (PRD 3.1 & 3.3):

- **Login & Informed Consent** (`src/app/page.tsx` + `src/components/ConsentForm.tsx`):
  partisipan mengisi username, membaca informed consent, dan **wajib** mencentang
  persetujuan — tombol mulai tidak aktif sebelum keduanya terpenuhi. Saat mulai:
  `participantId` (uuid v4) dibuat, grup 1–4 diacak (`assignTreatmentGroup()`),
  global timer 40 menit dimulai (deadline absolut), dan username disimpan ke
  `demographics.username` (kolom `participants.username` di Supabase). Semua lewat
  `ExperimentContext`; refresh di tengah sesi menampilkan panel lanjutkan, bukan
  sesi baru.
- **Step 1 — Skenario & Memo** (`src/app/(survey)/step-1-scenario/page.tsx` +
  `src/components/ScenarioContent.tsx`): kasus dasar PT Cahaya Gama (4 akun biaya
  bermasalah, total Rp1.000.000.000) + pesan klien & memo manajer yang dirender
  **dinamis per `treatmentGroupId`** sesuai matriks 2×2 (preferensi klien
  implisit/eksplisit × tekanan akuntabilitas lemah/kuat).

### Konten riset di `src/content/`

Semua teks riset terpusat di modul konten — **tidak ada teks treatment di
komponen**:

| Modul | Isi |
| --- | --- |
| `src/content/consent.ts` | Teks informed consent + janji insentif pulsa (PRD 3.1). |
| `src/content/scenario.ts` | Kasus dasar PT Cahaya Gama — sama untuk semua grup; total akun dikunci unit test. |
| `src/content/treatments.ts` | Matriks teks per grup 1–4 (objek per grup; struktur 2×2 dijamin unit test). |

> ⚠️ **Naskah riset final belum tersedia** — semua teks di modul ini bertanda
> `[PLACEHOLDER]` (fragmennya mengikuti matriks arsitektur). Saat naskah final
> diserahkan owner, cukup timpa modul-modul di atas tanpa menyentuh komponen.

### Override grup untuk pengujian (dev saja)

Di dev server (`npm run dev`), tambahkan query param `?group=1..4` pada
`/step-1-scenario` untuk memaksa salah satu varian teks (banner dev akan
muncul, grup asli hasil random assignment tidak berubah):

```bash
npm run dev
# buka http://localhost:3000/step-1-scenario?group=3
```

Di build produksi override ini **selalu nonaktif** — random assignment tidak
dapat ditimpa (`src/lib/dev-override.ts`, teruji).

## API — `POST /api/submit-survey`

Endpoint batch submit (BETE-7). Seluruh state eksperimen dikirim sekali di
langkah terakhir (Demografi) dan disimpan via RPC `submit_survey` dalam **satu
transaksi** (`participants` → `sessions` → `case_logs` × 14 → `survey_results`).
Validasi ketat pakai zod (`src/lib/submit-survey.ts`); tulisan memakai service
role di server saja.

**Kontrak respons:**

| Status | Body | Arti |
|---|---|---|
| `200` | `{ status: "created", sessionId, participantId }` | Submit baru berhasil tersimpan. |
| `200` | `{ status: "already_submitted", sessionId, participantId }` | Idempoten — submit ulang dengan `participantId` sama tidak menduplikasi baris (aman untuk retry/refresh/timeout auto-submit). |
| `400` | `{ error, details: [{ path, message }] }` | Payload invalid/tampered; tidak ada insert yang dieksekusi. |
| `500` | `{ error }` | Kesalahan internal (pesan umum; detail di log server). |

**Bentuk payload** (JSON, camelCase — detail validasi di `src/lib/submit-survey.ts`):

```jsonc
{
  "sessionData": {
    "participantId": "uuid-v4-dari-login",  // kunci idempotensi: satu sesi per partisipan
    "treatmentGroupId": 2,                   // 1–4 (random assignment)
    "globalTimeRemaining": 1725,             // 0–2400 detik saat submit
    "currentStep": 5                         // opsional; tidak disimpan
  },
  "caseLogs": [                              // TEPAT 14 entri, caseId 1–14 sekali masing-masing
    { "caseId": 1, "durationSeconds": 45, "isSaved": true, "rank": 3 },
    { "caseId": 2, "durationSeconds": 0, "isSaved": false, "rank": null }
  ],
  "recommendations": {
    "knowHowFee": 250000000, "entertainment": 150000000,
    "maintenance": 300000000, "marketing": 125000000,
    "confidenceLevel": 85                    // 0–100
  },
  "questionnaire": { "q1": "...", "q2": "...", "q3": "..." },
  "demographics": {
    "username": "budi",                      // dari login (kolom NOT NULL)
    "age": 28, "gender": "Laki-laki", "education": "S1",
    "affiliation": "KAP Sejahtera",          // dari form demografi (kolom NOT NULL)
    "phoneNumber": "081234567890"            // format Indonesia: 08xx/62xx/+62xx
  }
}
```

Catatan kontrak: `rank` unik 1–14 (boleh `null` untuk kasus belum diranking);
`sessionId` tidak ada di payload — server menurunkan identitas sesi dari
`participantId` (lihat `supabase/README.md`).

## Struktur Folder

Struktur *feature-driven* mengikuti `development-guidelines.md`:

```text
/src
 ├── app/
 │   ├── api/
 │   │   └── submit-survey/route.ts   # Endpoint API batch insert ke Supabase
 │   ├── (survey)/                    # Route group untuk UI eksperimen utama
 │   │   ├── layout.tsx               # Header global & slot Global Timer
 │   │   ├── step-1-scenario/page.tsx
 │   │   ├── step-2-cases/page.tsx    # Logic background stopwatch 14 kasus
 │   │   ├── step-3-form/page.tsx
 │   │   ├── step-4-quiz/page.tsx
 │   │   └── step-5-demographics/page.tsx
 │   ├── debriefing/page.tsx          # Halaman akhir (penutupan riset)
 │   └── page.tsx                     # Halaman Index (Login & Informed Consent)
 ├── components/
 │   ├── GlobalTimer.tsx
 │   ├── CaseModalTracker.tsx         # Komponen modal dengan pencatat detik
 │   └── Forms/
 ├── context/
 │   └── ExperimentContext.tsx        # React Context penyimpan State (JSON Data)
 └── lib/
     └── supabase.ts                  # Inisialisasi koneksi SDK Supabase
```

## Status

Scaffold awal: seluruh halaman berupa stub yang bisa dinavigasi antar langkah
sejak dini. Implementasi fitur (state engine & timer, time tracking, form,
submit batch, anti-cheat) menyusul pada tugas-tugas berikutnya.

Deployment produksi (Vercel) ditangani tugas DevOps pada stage akhir.

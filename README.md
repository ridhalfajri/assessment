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
| `npm run test` | Unit test (Vitest) — random assignment, matematika timer, reducer, persistensi |

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

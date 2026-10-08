# Supabase — Skema Database Eksperimen

Skema awal (migrasi `0001_init.sql`) untuk aplikasi eksperimen pengambilan keputusan pajak (BETE-5): 4 tabel, index pada semua FK dan kolom filter, serta RLS default-deny. Migrasi `0002_submit_survey_rpc.sql` (BETE-7) menambahkan RPC transaksional untuk endpoint `/api/submit-survey`.

## Ringkasan Tabel

### `participants` — data partisipan (demografi + PII)

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | UUID PK | default `gen_random_uuid()` |
| `username` | text NOT NULL | |
| `phone_number` | text NOT NULL | **PII** — No. HP untuk insentif pulsa |
| `gender` | text NOT NULL | |
| `age` | integer NOT NULL | |
| `education` | text NOT NULL | |
| `affiliation` | text NOT NULL | |
| `created_at` | timestamptz NOT NULL | default `now()` |

### `sessions` — satu sesi eksperimen (assignment + timer global)

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | UUID PK | default `gen_random_uuid()` |
| `participant_id` | UUID NOT NULL, FK → `participants(id)` | `ON DELETE CASCADE`, ber-index |
| `treatment_group` | integer NOT NULL | CHECK `1–4` (assignment acak; teks matriks treatment ada di frontend `src/content/`, bukan tabel) |
| `start_time` | timestamptz NOT NULL | default `now()` |
| `is_completed` | boolean NOT NULL | default `false` |
| `global_remaining_seconds` | integer | detik tersisa timer 40 menit saat submit; `null` selama sesi berjalan |
| `created_at` | timestamptz NOT NULL | default `now()` |

### `case_logs` — pelacakan pencarian informasi per kasus (14 kasus acuan)

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | BIGSERIAL PK (`bigint generated always as identity`) | |
| `session_id` | UUID NOT NULL, FK → `sessions(id)` | `ON DELETE CASCADE` |
| `case_id` | integer NOT NULL | CHECK `1–14` |
| `duration_seconds` | integer NOT NULL | CHECK `>= 0` — durasi stopwatch baca kasus |
| `is_saved` | boolean NOT NULL | jawaban sitasi **Ya/Tidak** per kasus (PRD) |
| `rank_assigned` | integer | peringkat prioritas 1–14 |
| `created_at` | timestamptz NOT NULL | default `now()` |

Constraint: `UNIQUE (session_id, case_id)` — satu baris per kasus per sesi (indeksnya sekaligus menutupi lookup FK `session_id`).

### `survey_results` — rekomendasi pajak + kuesioner (1:1 dengan sesi)

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | UUID PK | default `gen_random_uuid()` |
| `session_id` | UUID NOT NULL, FK → `sessions(id)` | `UNIQUE` (satu hasil per sesi) |
| `know_how_fee` / `entertainment` / `maintenance` / `marketing` | bigint NOT NULL | nilai rekomendasi 4 biaya (Rp) |
| `confidence_level` | integer NOT NULL | CHECK `0–100` (slider keyakinan) |
| `q1_answer` / `q2_answer` / `q3_answer` | text NOT NULL | 3 item kuesioner |
| `created_at` | timestamptz NOT NULL | default `now()` |

## Diagram Relasi

```mermaid
erDiagram
    PARTICIPANTS ||--o{ SESSIONS : "creates"
    SESSIONS ||--o{ CASE_LOGS : "tracks"
    SESSIONS ||--|| SURVEY_RESULTS : "yields"
```

## Menjalankan Migrasi di Lokal (Docker)

Migrasi **idempoten** — dijalankan berulang kali tanpa error.

```bash
# 1. Jalankan Postgres 16 lokal
docker run -d --name pg-experiment -e POSTGRES_PASSWORD=postgres postgres:16

# 2. Salin dan terapkan migrasi
docker cp supabase/migrations/0001_init.sql pg-experiment:/tmp/
docker cp supabase/migrations/0002_submit_survey_rpc.sql pg-experiment:/tmp/
docker exec pg-experiment psql -U postgres -f /tmp/0001_init.sql
docker exec pg-experiment psql -U postgres -f /tmp/0002_submit_survey_rpc.sql

# 3. Cek hasil (opsional)
docker exec pg-experiment psql -U postgres -c "\dt public.*"
```

> Uji integrasi endpoint memakai Postgres lokal yang sama — lihat `tests/submit-survey.integration.test.ts`:
> `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres npm test`.

> Tidak memakai Supabase CLI? Cara di atas cukup — skema ini SQL murni tanpa ekstensi, cocok untuk Supabase (PostgreSQL 15+). Untuk project Supabase sungguhan, file migrasi yang sama bisa diterapkan via `supabase db push`.

## RPC `submit_survey` (migrasi 0002, BETE-7)

Endpoint `POST /api/submit-survey` menyimpan seluruh state eksperimen lewat **satu panggilan RPC** = satu transaksi Postgres: `participants` → `sessions` → `case_logs` (bulk 14 baris) → `survey_results`. Gagal di tengah jalan = rollback penuh, tidak ada partial insert.

**Idempoten:** `sessions` punya constraint `UNIQUE (participant_id)` — satu sesi eksperimen per partisipan. Submit ulang (refresh, timeout auto-submit, retry setelah error) dengan `participantId` yang sama mendeteksi konflik, tidak menulis apa pun, dan mengembalikan status `already_submitted`. Race submit ganda simultan juga aman: yang kalah menunggu unique index sampai pemenang commit.

| Contract | Nilai |
|---|---|
| Argumen | `p_payload jsonb` — bentuknya payload state frontend (BETE-2), tervalidasi zod di `src/lib/submit-survey.ts` |
| Return | `{ "status": "created" \| "already_submitted", "sessionId", "participantId" }` |
| Eksekusi | hanya role `service_role` (REVOKE from public, GRANT to service_role) |

Keputusan turunan yang dicatat di migrasi:

- `sessionData` tidak membawa `sessionId` — identitas sesi diturunkan dari `participantId` via `UNIQUE (participant_id)` (satu login = satu run).
- `start_time` diturunkan dari `globalTimeRemaining`: timer wall-clock beranggaran 2400 s, jadi `start_time ≈ waktu submit − (2400 − sisa detik)`.
- `is_completed = true` saat submit (timer berhenti ketika submit berhasil).
- Index parsial unik `case_logs_session_rank_unique` pada `(session_id, rank_assigned) WHERE rank_assigned IS NOT NULL` — peringkat 1–14 unik per sesi (rank tetap boleh kosong untuk auto-submit belum lengkap).

## Catatan RLS (Row Level Security)

- RLS **aktif di semua 4 tabel** dengan policy **default-deny** (`deny_all_to_clients`): `using (false) with check (false)` untuk role `anon` dan `authenticated` — klien tidak bisa baca maupun tulis apa pun.
- Tulisan data hanya dilakukan **server** (`/api/submit-survey`, satu batch insert) memakai **service role key**, yang memiliki atribut `BYPASSRLS` sehingga melewati RLS.
- Alasan kebijakan ini: `participants.phone_number` adalah data PII (No. HP untuk insentif pulsa) dan data eksperimen tidak boleh terbaca/berubah dari browser.
- Service role key adalah credential server-side — simpan di environment variable server (mis. Vercel), jangan pernah di-commit atau dipakai di kode klien.

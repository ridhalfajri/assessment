# Supabase — Skema Database Eksperimen

Skema awal (migrasi `0001_init.sql`) untuk aplikasi eksperimen pengambilan keputusan pajak (BETE-5): 4 tabel, index pada semua FK dan kolom filter, serta RLS default-deny.

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
docker exec pg-experiment psql -U postgres -f /tmp/0001_init.sql

# 3. Cek hasil (opsional)
docker exec pg-experiment psql -U postgres -c "\dt public.*"
```

> Tidak memakai Supabase CLI? Cara di atas cukup — skema ini SQL murni tanpa ekstensi, cocok untuk Supabase (PostgreSQL 15+). Untuk project Supabase sungguhan, file migrasi yang sama bisa diterapkan via `supabase db push`.

## Catatan RLS (Row Level Security)

- RLS **aktif di semua 4 tabel** dengan policy **default-deny** (`deny_all_to_clients`): `using (false) with check (false)` untuk role `anon` dan `authenticated` — klien tidak bisa baca maupun tulis apa pun.
- Tulisan data hanya dilakukan **server** (`/api/submit-survey`, satu batch insert) memakai **service role key**, yang memiliki atribut `BYPASSRLS` sehingga melewati RLS.
- Alasan kebijakan ini: `participants.phone_number` adalah data PII (No. HP untuk insentif pulsa) dan data eksperimen tidak boleh terbaca/berubah dari browser.
- Service role key adalah credential server-side — simpan di environment variable server (mis. Vercel), jangan pernah di-commit atau dipakai di kode klien.

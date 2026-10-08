/**
 * Helper murni Step 2 — Information Search (BETE-9): matematika stopwatch per
 * kasus, kepemilikan peringkat, dan gerbang navigasi ke step-3. Semua fungsi
 * bebas React dan I/O browser agar mudah di-unit-test (lihat
 * case-tracking.test.ts).
 *
 * Keputusan desain BETE-9 (default, menunggu konfirmasi owner):
 *  - Stopwatch berjalan wall-clock (dihitung dari timestamp, bukan hitungan
 *    interval) sehingga tetap menghitung waktu saat tab pindah ke background.
 *  - Durasi akumulatif: membuka kembali modal menambah ke durasi kasus itu.
 *  - is_saved (sitasi) adalah checkbox per kasus: dicentang = Ya, default
 *    tidak dicentang = Tidak (sesuai makna is_saved di PRD & skema BETE-5).
 *  - Gerbang lanjut ke step-3: SEMUA kasus punya catatan (log) di caseLogs dan
 *    peringkat 1–14 terpasang unik (permutasi penuh). Karena penugasan
 *    peringkat menyentuh tiap kasus, syarat ini menjamin setiap kasus juga
 *    memiliki status sitasi tersimpan.
 */

import type { CaseLog } from "@/lib/experiment";

/** Peringkat prioritas yang valid: 1..14 (satu peringkat hanya untuk satu kasus). */
export const RANK_MIN = 1;
export const RANK_MAX = 14;

/**
 * Durasi kumulatif (detik) saat modal terbuka: durasi sebelumnya + selisih
 * jam dinding sejak modal dibuka. Pembagian detik dipotong ke bawah agar
 * tampilan tidak pernah lebih cepat dari nyata (toleransi uji ±1 detik).
 * `nowMs` < `openedAtMs` (jam berubah) → kembalikan durasi dasar saja.
 */
export function computeElapsedSeconds(baseSeconds: number, openedAtMs: number, nowMs: number): number {
  const base = Math.max(0, Math.floor(baseSeconds));
  const elapsed = Math.floor((nowMs - openedAtMs) / 1000);
  return base + Math.max(0, elapsed);
}

/**
 * Kasus pemilik `rank` (selain `excludeCaseId`), atau null bila peringkat
 * masih bebas. Dipakai UI untuk MENOLAK peringkat ganda dengan pesan jelas —
 * peringkat ganda tidak pernah tersimpan.
 */
export function findRankOwner(logs: CaseLog[], rank: number, excludeCaseId?: number): number | null {
  const owner = logs.find((c) => c.rank === rank && c.caseId !== excludeCaseId);
  return owner ? owner.caseId : null;
}

/** Log kasus untuk caseId, atau undefined bila belum ada catatan. */
export function getCaseLog(logs: CaseLog[], caseId: number): CaseLog | undefined {
  return logs.find((c) => c.caseId === caseId);
}

/**
 * Gerbang navigasi ke step-3: terpenuhi bila setiap kasus 1..caseCount punya
 * catatan di caseLogs DAN peringkatnya membentuk permutasi 1..caseCount
 * (semua terisi, tidak ada duplikat). Reducer menolak peringkat ganda, tapi
 * gerbang tetap memverifikasi sebagai pengaman terakhir.
 */
export function isStep2GateSatisfied(logs: CaseLog[], caseCount: number): boolean {
  if (logs.length < caseCount) return false;
  const ranks: number[] = [];
  for (let caseId = 1; caseId <= caseCount; caseId += 1) {
    const log = getCaseLog(logs, caseId);
    if (!log || log.rank === null) return false;
    ranks.push(log.rank);
  }
  return (
    ranks.length === caseCount &&
    ranks.every((rank) => rank >= RANK_MIN && rank <= RANK_MAX) &&
    new Set(ranks).size === caseCount
  );
}

/**
 * Jumlah kasus yang sudah memiliki peringkat — untuk indikator progres
 * "Peringkat terisi: X/14" di halaman step-2.
 */
export function countRankedCases(logs: CaseLog[], caseCount: number): number {
  let count = 0;
  for (let caseId = 1; caseId <= caseCount; caseId += 1) {
    const log = getCaseLog(logs, caseId);
    if (log && log.rank !== null) count += 1;
  }
  return count;
}

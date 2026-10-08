/**
 * Kasus dasar PT Cahaya Gama (PRD 3.3) — konten skenario yang SAMA untuk
 * semua grup treatment. Teks yang berbeda per grup (preferensi klien & memo
 * manajer) ada di `src/content/treatments.ts`.
 *
 * ⚠️ Narasi & pembagian nominal per akun masih PLACEHOLDER — naskah riset
 * final akan diserahkan owner. Yang terkunci dari PRD: 4 akun biaya
 * bermasalah dengan TOTAL Rp1.000.000.000 (dijamin unit test).
 */

export type ScenarioAccountId =
  | "know_how_fee"
  | "entertainment"
  | "maintenance"
  | "marketing";

export type ScenarioAccount = {
  /** Senada dengan field rekomendasi di payload submit (BETE-7). */
  id: ScenarioAccountId;
  label: string;
  amountRp: number;
};

export const TOTAL_PROBLEM_EXPENSE_RP = 1_000_000_000;

export const SCENARIO_CONTENT = {
  companyName: "PT Cahaya Gama",
  /**
   * [PLACEHOLDER] Narasi latar perusahaan & konteks penugasan — ganti dengan
   * naskah final owner.
   */
  introParagraphs: [
    "[PLACEHOLDER — naskah final akan diserahkan owner] Anda adalah staf " +
      "konsultan pajak yang ditugaskan menangani klien PT Cahaya Gama untuk " +
      "tahun pajak berjalan.",
    "[PLACEHOLDER — naskah final akan diserahkan owner] Dalam pemeriksaan " +
      "awal, Anda menemukan empat akun biaya yang berpotensi bermasalah " +
      "dengan total nilai Rp1.000.000.000.",
  ],
  /** [PLACEHOLDER] Pembagian nominal per akun provisional; total = Rp1 M (PRD). */
  accounts: [
    { id: "know_how_fee", label: "Jasa Konsultasi (Know-how Fee)", amountRp: 300_000_000 },
    { id: "entertainment", label: "Entertainment", amountRp: 250_000_000 },
    { id: "maintenance", label: "Perbaikan (Maintenance)", amountRp: 250_000_000 },
    { id: "marketing", label: "Pemasaran (Marketing)", amountRp: 200_000_000 },
  ] as ScenarioAccount[],
  totalLabel: "Total akun biaya bermasalah",
  /** [PLACEHOLDER] Instruksi tugas umum sebelum membuka memo manajer. */
  taskParagraphs: [
    "[PLACEHOLDER — naskah final akan diserahkan owner] Baca skenario, " +
      "pesan dari klien, dan memo dari manajer dengan saksama. Pada langkah " +
      "berikutnya Anda akan mencari kasus acuan, lalu memberikan rekomendasi " +
      "jumlah biaya yang layak dibebankan.",
  ],
};
